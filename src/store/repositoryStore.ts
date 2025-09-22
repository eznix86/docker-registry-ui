import { del as idbDel, get as idbGet, set as idbSet } from "idb-keyval";
import { produce } from "immer";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
	type ArchitectureInfo,
	ContainerRegistryClient,
	type Repository as OOPRepository,
	type Tag as OOPTag,
	type SourceInfo,
} from "../lib/container-registry";

export interface Tag {
	name: string;
	digest: string;
	size: string;
	lastUpdated: string;
	architectures: ArchitectureInfo[];
	mediaType: string;
}

export interface RepositoryMeta {
	name: string;
	namespace?: string;
	tagCount: number;
	totalSize: number;
	totalSizeFormatted: string;
	architectures: string[];
	lastUpdated: string;
	createdAt: string;
	source?: string;
}

export interface RepositoryDetail {
	name: string;
	namespace?: string;
	tagCount: number;
	totalSize: number;
	totalSizeFormatted: string;
	architectures: string[];
	lastUpdated: string;
	tags: Tag[];
	createdAt: string;
	source?: string;
}

export interface Repository {
	name: string;
	namespace?: string;
	architecture?: string[];
	size?: string;
	tags?: Tag[];
	lastUpdated?: string;
	tagsLoaded?: boolean;
	manifestLoaded?: boolean;
	tagCount?: number;
}

export interface RepositoryInfo {
	name: string;
	namespace?: string;
	tags: Tag[];
}

interface LoadingStage {
	stage: "idle" | "catalog" | "tags" | "manifests" | "complete";
	progress: number;
	message: string;
}

const storage = createJSONStorage(() => ({
	getItem: async (name: string) => {
		const value = await idbGet(name);
		return value ? JSON.stringify(value) : null;
	},
	setItem: async (name: string, value: string) => {
		await idbSet(name, JSON.parse(value));
	},
	removeItem: async (name: string) => {
		await idbDel(name);
	},
}));

function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 Bytes";
	const k = 1024;
	const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

function parseRepositoryName(repoName: string): {
	name: string;
	namespace?: string;
} {
	const parts = repoName.split("/");
	const name = parts.length > 1 ? parts[parts.length - 1] : repoName;
	const namespace = parts.length > 1 ? parts.slice(0, -1).join("/") : undefined;
	return { name, namespace };
}

function calculateRepositorySize(tags: Tag[]): number {
	return tags.reduce((sum, tag) => {
		const sizeMatch = tag.size.match(/^([\d.]+)\s*(\w+)$/);
		if (sizeMatch) {
			const value = parseFloat(sizeMatch[1]);
			const unit = sizeMatch[2];
			const multipliers: { [key: string]: number } = {
				Bytes: 1,
				KB: 1024,
				MB: 1024 * 1024,
				GB: 1024 * 1024 * 1024,
				TB: 1024 * 1024 * 1024 * 1024,
			};
			return sum + value * (multipliers[unit] || 1);
		}
		return sum;
	}, 0);
}

function fetchWithTimeout(
	url: string,
	options: RequestInit = {},
	timeoutMs: number = 3000,
): Promise<Response> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

	return fetch(url, {
		...options,
		signal: controller.signal,
	}).finally(() => {
		clearTimeout(timeoutId);
	});
}

async function fetchStatusCodes(): Promise<
	Record<string, StatusCodeDefinition>
> {
	try {
		const response = await fetchWithTimeout("/errors.json");
		if (response.ok) {
			return await response.json();
		}
	} catch (error) {
		console.warn("Failed to fetch status codes:", error);
	}
	return {};
}

async function fetchSources(): Promise<Record<string, SourceInfo>> {
	try {
		const response = await fetchWithTimeout("/sources.json");
		if (response.ok) {
			return await response.json();
		}
	} catch (error) {
		console.warn("Failed to fetch sources:", error);
	}
	return {};
}

async function fetchCatalog(
	sourcePath: string,
): Promise<{ repositories: string[]; status: number }> {
	const url = `${sourcePath}/v2/_catalog`;
	const response = await fetchWithTimeout(url);
	if (!response.ok) {
		return { repositories: [], status: response.status };
	}
	const data = await response.json();
	return { repositories: data.repositories || [], status: response.status };
}

async function fetchTags(
	repoName: string,
	sourcePath: string,
): Promise<string[]> {
	const url = `${sourcePath}/v2/${repoName}/tags/list`;
	const response = await fetchWithTimeout(url);
	if (!response.ok) {
		if (response.status === 404) return [];
		throw new Error(
			`Failed to fetch tags for ${repoName}: ${response.statusText}`,
		);
	}
	const data = await response.json();
	return data.tags || [];
}

async function _fetchManifest(
	repoName: string,
	tagName: string,
	sourcePath: string,
): Promise<Response> {
	const url = `${sourcePath}/v2/${encodeURIComponent(repoName)}/manifests/${tagName}`;
	const response = await fetchWithTimeout(url, {
		headers: {
			Accept:
				"application/vnd.oci.image.index.v1+json, application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.manifest.v1+json",
		},
	});
	if (!response.ok) {
		throw new Error(
			`Failed to fetch manifest for ${repoName}:${tagName}: ${response.statusText}`,
		);
	}
	return response;
}

async function fetchConfig(
	repoName: string,
	configDigest: string,
	sourcePath: string,
): Promise<{
	created: string | null;
	architecture: string;
	os: string;
	variant?: string;
} | null> {
	try {
		const url = `${sourcePath}/v2/${repoName}/blobs/${configDigest}`;
		const response = await fetchWithTimeout(url, {
			headers: { Accept: "application/json, application/octet-stream" },
		});

		if (response.ok) {
			const data = await response.json();
			return {
				created: data.created || data.history?.[0]?.created || null,
				architecture: data.architecture || "amd64",
				os: data.os || "linux",
				variant: data.variant,
			};
		}
		return null;
	} catch (error) {
		if (!(error instanceof TypeError)) {
			console.warn(`Failed to fetch config ${configDigest}:`, error);
		}
		return null;
	}
}

async function _processManifest(
	repoName: string,
	tagName: string,
	manifestResponse: Response,
	sourcePath: string,
): Promise<Tag | null> {
	try {
		const manifest = await manifestResponse.json();

		const manifestDigest =
			manifestResponse.headers.get("Docker-Content-Digest") || "";

		const digest = manifestDigest || tagName;

		let architectures: ArchitectureInfo[] = [];
		let totalSize = 0;
		let timestamp = new Date().toISOString();

		if (
			manifest.mediaType ===
			"application/vnd.docker.distribution.manifest.list.v2+json" ||
			manifest.mediaType === "application/vnd.oci.image.index.v1+json"
		) {
			if (manifest.manifests) {
				const imageManifests = manifest.manifests.filter(
					(archManifest: ManifestReference) =>
						archManifest.annotations?.["vnd.docker.reference.type"] !==
						"attestation-manifest",
				);

				const archPromises = imageManifests.map(
					async (archManifest: ManifestReference) => {
						const arch = archManifest.platform?.architecture || "amd64";
						const os = archManifest.platform?.os || "linux";
						const variant = archManifest.platform?.variant;

						try {
							let acceptHeader = "";
							if (
								manifest.mediaType === "application/vnd.oci.image.index.v1+json"
							) {
								acceptHeader = "application/vnd.oci.image.manifest.v1+json";
							} else if (
								manifest.mediaType ===
								"application/vnd.docker.distribution.manifest.list.v2+json"
							) {
								acceptHeader =
									"application/vnd.docker.distribution.manifest.v2+json";
							} else {
								acceptHeader =
									"application/vnd.oci.image.manifest.v1+json, application/vnd.docker.distribution.manifest.v2+json";
							}

							const individualManifestResponse = await fetchWithTimeout(
								`${sourcePath}/v2/${repoName}/manifests/${archManifest.digest}`,
								{
									headers: {
										Accept: acceptHeader,
									},
								},
							);

							if (individualManifestResponse.ok) {
								const individualManifest =
									await individualManifestResponse.json();

								if (individualManifest.config && individualManifest.layers) {
									const configSize = individualManifest.config.size || 0;
									const layersSize = individualManifest.layers.reduce(
										(acc: number, layer: { size?: number }) =>
											acc + (layer.size || 0),
										0,
									);
									const size = configSize + layersSize;

									return {
										architecture: arch,
										digest: archManifest.digest,
										size: formatBytes(size),
										os: os,
										variant: variant,
										sizeBytes: size,
									};
								}
							}
						} catch (error) {
							console.warn(
								`Failed to fetch individual manifest for ${arch}:`,
								error,
							);
						}
						return null;
					},
				);

				const archResults = await Promise.all(archPromises);

				for (const result of archResults) {
					if (result) {
						architectures.push({
							architecture: result.architecture,
							digest: result.digest,
							size: result.size,
							os: result.os,
							variant: result.variant,
						});
						totalSize += result.sizeBytes;
					}
				}
			}
		} else if (
			manifest.mediaType ===
			"application/vnd.docker.distribution.manifest.v2+json" ||
			manifest.mediaType === "application/vnd.oci.image.manifest.v1+json"
		) {
			if (manifest.config && manifest.layers) {
				const configInfo = await fetchConfig(
					repoName,
					manifest.config.digest,
					sourcePath,
				);

				if (configInfo?.created) {
					timestamp = configInfo.created;
				}

				const configSize = manifest.config.size || 0;
				const layersSize = manifest.layers.reduce(
					(acc: number, layer: { size?: number }) => acc + (layer.size || 0),
					0,
				);
				totalSize = configSize + layersSize;

				architectures = [
					{
						architecture: configInfo?.architecture || "amd64",
						digest: digest,
						size: formatBytes(totalSize),
						os: configInfo?.os || "linux",
						variant: configInfo?.variant,
					},
				];
			}
		} else {
			console.warn(`Unknown manifest type for ${tagName}:`, manifest.mediaType);
			totalSize = 0;
			architectures = [
				{
					architecture: "amd64",
					digest: digest,
					size: "Unknown",
					os: "linux",
					variant: undefined,
				},
			];
		}

		return {
			name: tagName,
			digest: digest,
			size: formatBytes(totalSize),
			lastUpdated: timestamp,
			architectures: architectures,
			mediaType:
				manifest.mediaType ||
				"application/vnd.docker.distribution.manifest.v2+json",
		};
	} catch (error) {
		console.warn(`Failed to process manifest for ${tagName}:`, error);
		return null;
	}
}

interface StatusCodeDefinition {
	code: number;
	message: string;
	description?: string;
}

interface RepositoryStore {
	repositoryMetas: RepositoryMeta[];
	repositoryDetails: { [key: string]: RepositoryDetail };
	sources: Record<string, SourceInfo>;
	statusCodes: Record<string, StatusCodeDefinition>;
	clients: ContainerRegistryClient[];

	loading: boolean;
	loadingStage: LoadingStage;
	error: string | null;
	lastFetch: number | null;
	availableArchitectures: string[];
	hydrated: boolean;

	fetchSources: () => Promise<void>;
	fetchStatusCodes: () => Promise<void>;
	fetchRepositoryMetas: (force?: boolean) => Promise<void>;
	fetchRepositoryMetasLight: (force?: boolean) => Promise<void>;
	fetchRepositoryDetail: (
		name: string,
		namespace?: string,
		source?: string,
	) => Promise<void>;
	startPeriodicRefresh: () => void;
	stopPeriodicRefresh: () => void;
	clearError: () => void;
	setHydrated: (hydrated: boolean) => void;
	getStatusCodeInfo: (code: number) => StatusCodeDefinition | undefined;
	deleteRepository: (
		name: string,
		namespace?: string,
		source?: string,
	) => Promise<boolean>;
	deleteTag: (
		repositoryName: string,
		tagName: string,
		namespace?: string,
		source?: string,
	) => Promise<boolean>;
}

let refreshInterval: NodeJS.Timeout | null = null;
let manifestRefreshInterval: NodeJS.Timeout | null = null;
let visibilityChangeListener: (() => void) | null = null;

// Export useShallow for components to use
export { useShallow } from "zustand/react/shallow";

export const useRepositoryStore = create<RepositoryStore>()(
	persist(
		(set, get) => ({
			repositoryMetas: [],
			repositoryDetails: {},
			sources: {},
			statusCodes: {},
			clients: [],
			loading: false,
			loadingStage: { stage: "idle", progress: 0, message: "Ready" },
			error: null,
			lastFetch: null,
			availableArchitectures: [],
			hydrated: false,

			fetchSources: async () => {
				try {
					const sourcesData = await fetchSources();
					if (Object.keys(sourcesData).length > 0) {
						const clients =
							await ContainerRegistryClient.fromSources(sourcesData);
						set({ sources: sourcesData, clients });
					} else {
						console.warn(
							"No sources found in sources.json. Please configure your registry sources.",
						);
						set({ sources: {}, clients: [] });
					}
				} catch (error) {
					console.error("Failed to fetch sources:", error);
					set({ sources: {}, clients: [] });
				}
			},

			fetchStatusCodes: async () => {
				const state = get();
				if (Object.keys(state.statusCodes).length === 0) {
					const statusCodes = await fetchStatusCodes();
					set({ statusCodes });
				}
			},

			getStatusCodeInfo: (code: number) => {
				const state = get();
				return state.statusCodes[code.toString()];
			},

			fetchRepositoryMetas: async (force: boolean = false) => {
				const state = get();
				const thirtySeconds = 30 * 1000;

				if (
					!force &&
					state.lastFetch &&
					Date.now() - state.lastFetch < thirtySeconds &&
					state.repositoryMetas.length > 0
				) {
					return;
				}

				// Ensure sources and clients are available
				if (
					Object.keys(state.sources).length === 0 ||
					state.clients.length === 0
				) {
					await get().fetchSources();
				}

				set({
					loading: true,
					error: null,
					loadingStage: {
						stage: "catalog",
						progress: 5,
						message: "Fetching repositories...",
					},
				});

				try {
					// Get the updated state after fetchSources
					const updatedState = get();
					const clients = updatedState.clients;

					if (clients.length === 0) {
						throw new Error(
							"No registry clients available. Please check your sources configuration.",
						);
					}

					// Fetch repositories from all clients concurrently
					const clientPromises = clients.map(async (client) => {
						try {
							const repos = await client.repositories();
							const pingResult = await client.ping();

							// Update registry status
							const updatedRegistry = client.registry.updateStatus(
								pingResult.status,
							);

							return {
								registryName: client.registry.name,
								registry: updatedRegistry,
								repositories: repos,
								status: pingResult.status,
							};
						} catch (error) {
							console.warn(
								`Failed to fetch from ${client.registry.name}:`,
								error,
							);
							let status = 0;
							if (error instanceof Error) {
								if (error.name === "AbortError") {
									status = 408;
								} else if (error.message.includes("Failed to fetch catalog")) {
									status = 500;
								} else {
									status = 0;
								}
							}

							const updatedRegistry = client.registry.updateStatus(status);

							return {
								registryName: client.registry.name,
								registry: updatedRegistry,
								repositories: [],
								status,
							};
						}
					});

					const clientResults = await Promise.all(clientPromises);

					// Update sources with new status information
					const updatedSources = { ...updatedState.sources };
					for (const { registryName, registry } of clientResults) {
						if (updatedSources[registryName]) {
							updatedSources[registryName] = {
								...updatedSources[registryName],
								status: registry.status,
								lastChecked: registry.lastChecked,
							};
						}
					}
					set({ sources: updatedSources });

					// Flatten all repositories
					const allRepos = clientResults.flatMap(
						({ registryName, repositories }) =>
							repositories.map((repo) => ({ registryName, repository: repo })),
					);

					set({
						loadingStage: {
							stage: "tags",
							progress: 25,
							message: `Found ${allRepos.length} repositories from ${clientResults.length} registries`,
						},
					});

					// Fetch tags for all repositories concurrently in batches
					const BATCH_SIZE = 10;
					const reposWithTags: Array<{
						registryName: string;
						repository: OOPRepository;
						tags: OOPTag[];
					}> = [];

					for (let i = 0; i < allRepos.length; i += BATCH_SIZE) {
						const batch = allRepos.slice(i, i + BATCH_SIZE);

						const tagPromises = batch.map(
							async ({ registryName, repository }) => {
								try {
									const tags = await repository.tags();
									return { registryName, repository, tags };
								} catch (error) {
									console.warn(
										`Failed to fetch tags for ${repository.fullName}:`,
										error,
									);
									return { registryName, repository, tags: [] };
								}
							},
						);

						const batchResults = await Promise.all(tagPromises);
						reposWithTags.push(...batchResults);

						// Update progress
						const completedRepos = Math.min(i + BATCH_SIZE, allRepos.length);
						const progress = 25 + (completedRepos / allRepos.length) * 25;
						set({
							loadingStage: {
								stage: "tags",
								progress: Math.min(progress, 50),
								message: `Processing tags: ${completedRepos}/${allRepos.length} repositories`,
							},
						});
					}

					set({
						loadingStage: {
							stage: "manifests",
							progress: 50,
							message: "Fetching sample manifests...",
						},
					});

					const processedRepos: RepositoryMeta[] = [];
					const allArchitectures = new Set<string>();

					// Process repositories in batches for better performance
					for (let i = 0; i < reposWithTags.length; i += BATCH_SIZE) {
						const batch = reposWithTags.slice(i, i + BATCH_SIZE);

						const batchPromises = batch.map(
							async ({ registryName, repository, tags }) => {
								const { name, namespace } = {
									name: repository.name,
									namespace: repository.namespace,
								};

								if (tags.length === 0) {
									return {
										name,
										namespace,
										tagCount: 0,
										totalSize: 0,
										totalSizeFormatted: "0 B",
										architectures: [],
										lastUpdated: new Date().toISOString(),
										createdAt: new Date().toISOString(),
										source: registryName,
									};
								}

								// Sample first 2 tags for performance
								const sampleTags = tags.slice(0, 2);
								const processedTags: Tag[] = [];

								// Process tags concurrently
								const manifestPromises = sampleTags.map(async (tag) => {
									try {
										const manifest = await tag.manifest();
										const images = await manifest.images();

										if (images.length === 0) return null;

										// For architectures, get info from each image
										const architectures: ArchitectureInfo[] = images.map(
											(image) => image.architectureInfo,
										);

										// For size calculation:
										// - Single arch: size is in the manifest (config + layers)
										// - Multi arch: sum of all child manifest sizes
										let totalSize = 0;
										if (manifest.isMultiPlatform()) {
											// Multi-arch: sum sizes from all images (child manifests already fetched)
											totalSize = images.reduce(
												(sum, image) => sum + image.size,
												0,
											);
										} else {
											// Single arch: use the image size (config + layers from manifest)
											totalSize = images[0].size;
										}

										// For lastUpdated, get the created timestamp from image config blob
										let lastUpdated = new Date().toISOString();
										try {
											// Try to get created timestamp from the first image's config
											const configBlob = await images[0].config.blob();
											if (configBlob.created) {
												lastUpdated = configBlob.created;
											}
										} catch (error) {
											// If config blob fetch fails, fall back to current timestamp
											console.warn(
												`Failed to fetch config blob for ${repository.fullName}:${tag.name}:`,
												error,
											);
										}

										return {
											name: tag.name,
											digest: manifest.digest,
											size: formatBytes(totalSize),
											lastUpdated,
											architectures,
											mediaType: manifest.mediaType,
										};
									} catch (error) {
										console.warn(
											`Failed to process ${repository.fullName}:${tag.name}:`,
											error,
										);
										return null;
									}
								});

								const manifestResults =
									await Promise.allSettled(manifestPromises);
								const successfulTags = manifestResults
									.filter(
										(result): result is PromiseFulfilledResult<Tag | null> =>
											result.status === "fulfilled" && result.value !== null,
									)
									.map((result) => result.value as Tag);

								processedTags.push(...successfulTags);

								if (processedTags.length > 0) {
									const totalSize = calculateRepositorySize(processedTags);
									const architectures = [
										...new Set(
											processedTags.flatMap((tag) =>
												tag.architectures.map((arch) =>
													arch.variant
														? `${arch.architecture}/${arch.variant}`
														: arch.architecture,
												),
											),
										),
									];
									const latestTag = processedTags.reduce((latest, tag) =>
										new Date(tag.lastUpdated) > new Date(latest.lastUpdated)
											? tag
											: latest,
									);

									return {
										name,
										namespace,
										tagCount: tags.length,
										totalSize,
										totalSizeFormatted: formatBytes(totalSize),
										architectures,
										lastUpdated: latestTag.lastUpdated,
										createdAt: new Date().toISOString(),
										source: registryName,
									};
								}
								return null;
							},
						);

						const batchResults = await Promise.allSettled(batchPromises);
						const validRepos = batchResults
							.filter(
								(
									result,
								): result is PromiseFulfilledResult<RepositoryMeta | null> =>
									result.status === "fulfilled" && result.value !== null,
							)
							.map((result) => result.value as RepositoryMeta);

						// Log any batch processing failures
						const rejectedCount = batchResults.filter(
							(result) => result.status === "rejected",
						).length;
						if (rejectedCount > 0) {
							console.warn(
								`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${rejectedCount} repositories failed to process`,
							);
						}

						for (const repo of validRepos) {
							processedRepos.push(repo);
							for (const arch of repo.architectures) {
								allArchitectures.add(arch);
							}
						}

						// Update progress after each batch
						const completedRepos = Math.min(
							i + BATCH_SIZE,
							reposWithTags.length,
						);
						const progress = 50 + (completedRepos / reposWithTags.length) * 40;
						set({
							loadingStage: {
								stage: "manifests",
								progress: Math.min(progress, 90),
								message: `Processing manifests: ${completedRepos}/${reposWithTags.length} repositories`,
							},
						});
					}

					set({
						repositoryMetas: processedRepos,
						availableArchitectures: [...allArchitectures].sort(),
						loading: false,
						loadingStage: {
							stage: "complete",
							progress: 100,
							message: `Loaded ${processedRepos.length} repositories`,
						},
						lastFetch: Date.now(),
					});
				} catch (error) {
					console.error("Failed to fetch repository metas:", error);
					set({
						error: `Failed to load repositories: ${error instanceof Error ? error.message : "Unknown error"}`,
						loading: false,
						loadingStage: {
							stage: "idle",
							progress: 0,
							message: "Error occurred",
						},
					});
				}
			},

			fetchRepositoryMetasLight: async (force: boolean = false) => {
				const state = get();
				const thirtySeconds = 30 * 1000;

				if (
					!force &&
					state.lastFetch &&
					Date.now() - state.lastFetch < thirtySeconds &&
					state.repositoryMetas.length > 0
				) {
					return;
				}

				if (Object.keys(state.sources).length === 0) {
					await get().fetchSources();
				}

				try {
					const updatedState = get();
					const sources = updatedState.sources;

					if (Object.keys(sources).length === 0) {
						throw new Error("No sources available");
					}

					const sourcePromises = Object.entries(sources).map(
						async ([sourceName, sourceInfo]) => {
							try {
								const { repositories, status } = await fetchCatalog(
									sourceInfo.path,
								);
								const updatedSourceInfo = {
									...sourceInfo,
									status,
									lastChecked: Date.now(),
								};

								const reposWithTags = [];
								for (const repoName of repositories) {
									try {
										const tags = await fetchTags(repoName, sourceInfo.path);
										reposWithTags.push({
											sourceName,
											sourceInfo: updatedSourceInfo,
											repoName,
											tags,
										});
									} catch (error) {
										console.warn(
											`Failed to fetch tags for ${repoName}:`,
											error,
										);
										reposWithTags.push({
											sourceName,
											sourceInfo: updatedSourceInfo,
											repoName,
											tags: [],
										});
									}
								}

								return {
									sourceName,
									sourceInfo: updatedSourceInfo,
									reposWithTags,
								};
							} catch (error) {
								console.warn(`Failed to fetch from ${sourceName}:`, error);
								let status = 500;
								if (error instanceof Error && error.name === "AbortError") {
									status = 408;
								}
								const updatedSourceInfo = {
									...sourceInfo,
									status,
									lastChecked: Date.now(),
								};
								return {
									sourceName,
									sourceInfo: updatedSourceInfo,
									reposWithTags: [],
								};
							}
						},
					);

					const sourceResults = await Promise.all(sourcePromises);

					const updatedSources = { ...sources };
					for (const { sourceName, sourceInfo } of sourceResults) {
						updatedSources[sourceName] = sourceInfo;
					}

					const processedRepos: RepositoryMeta[] = [];
					const allArchitectures = new Set<string>();

					for (const { sourceName, reposWithTags } of sourceResults) {
						for (const { repoName, tags } of reposWithTags) {
							const { name, namespace } = parseRepositoryName(repoName);

							const existingRepo = state.repositoryMetas.find((repo) => {
								const existingKey = repo.namespace
									? `${repo.namespace}/${repo.name}`
									: repo.name;
								const currentKey = namespace ? `${namespace}/${name}` : name;
								return existingKey === currentKey && repo.source === sourceName;
							});

							processedRepos.push({
								name,
								namespace,
								tagCount: tags.length,
								totalSize: existingRepo?.totalSize || 0,
								totalSizeFormatted:
									existingRepo?.totalSizeFormatted || "Unknown",
								architectures: existingRepo?.architectures || [],
								lastUpdated: new Date().toISOString(),
								createdAt: existingRepo?.createdAt || new Date().toISOString(),
								source: sourceName,
							});

							if (existingRepo?.architectures) {
								for (const arch of existingRepo.architectures) {
									allArchitectures.add(arch);
								}
							}
						}
					}

					set({
						repositoryMetas: processedRepos,
						sources: updatedSources,
						availableArchitectures: [...allArchitectures].sort(),
						lastFetch: Date.now(),
					});
				} catch (error) {
					console.error("Failed to fetch repository metas (light):", error);
					set({
						error: `Failed to load repositories: ${error instanceof Error ? error.message : "Unknown error"}`,
					});
				}
			},

			fetchRepositoryDetail: async (
				name: string,
				namespace?: string,
				source?: string,
			) => {
				const repoKey = namespace ? `${namespace}/${name}` : name;
				const state = get();

				const existingDetail = state.repositoryDetails[repoKey];
				if (
					existingDetail &&
					Date.now() - new Date(existingDetail.createdAt).getTime() < 30000
				) {
					return;
				}

				if (
					Object.keys(state.sources).length === 0 ||
					state.clients.length === 0
				) {
					await get().fetchSources();
				}

				try {
					// Get the updated state after fetchSources
					const updatedState = get();
					const clients = updatedState.clients;

					if (clients.length === 0) {
						throw new Error(
							"No registry clients available. Please check your sources configuration.",
						);
					}

					// Find the appropriate client
					let targetClient: ContainerRegistryClient;
					let registryName: string;

					if (source) {
						// Use specific source if provided
						const client = clients.find((c) => c.registry.name === source);
						if (!client) {
							throw new Error(
								`Registry client not found for source: ${source}`,
							);
						}
						targetClient = client;
						registryName = source;
					} else {
						// Find client based on existing repository metadata
						const existingRepo = updatedState.repositoryMetas.find((repo) => {
							const existingKey = repo.namespace
								? `${repo.namespace}/${repo.name}`
								: repo.name;
							return existingKey === repoKey;
						});

						if (existingRepo?.source) {
							const client = clients.find(
								(c) => c.registry.name === existingRepo.source,
							);
							if (client) {
								targetClient = client;
								registryName = existingRepo.source;
							} else {
								targetClient = clients[0];
								registryName = clients[0].registry.name;
							}
						} else {
							targetClient = clients[0];
							registryName = clients[0].registry.name;
						}
					}

					// Find the repository using OOP client
					const repository = await targetClient.repository(name, namespace);
					if (!repository) {
						throw new Error(`Repository ${repoKey} not found`);
					}

					// Get all tags using OOP approach
					const oopTags = await repository.tags();
					const tags: Tag[] = [];

					// Process tags concurrently for better performance
					const BATCH_SIZE = 5; // Smaller batch size for detailed fetching
					for (let i = 0; i < oopTags.length; i += BATCH_SIZE) {
						const batch = oopTags.slice(i, i + BATCH_SIZE);

						const batchPromises = batch.map(async (oopTag) => {
							try {
								const manifest = await oopTag.manifest();
								const images = await manifest.images();

								if (images.length === 0) return null;

								// Get architecture info from each image
								const architectures: ArchitectureInfo[] = images.map(
									(image) => image.architectureInfo,
								);

								// Calculate total size properly
								let totalSize = 0;
								if (manifest.isMultiPlatform()) {
									// Multi-arch: sum sizes from all images
									totalSize = images.reduce(
										(sum, image) => sum + image.size,
										0,
									);
								} else {
									// Single arch: use the image size
									totalSize = images[0].size;
								}

								// Get lastUpdated from config blob
								let lastUpdated = new Date().toISOString();
								try {
									const configBlob = await images[0].config.blob();
									if (configBlob.created) {
										lastUpdated = configBlob.created;
									}
								} catch (error) {
									console.warn(
										`Failed to fetch config blob for ${repository.fullName}:${oopTag.name}:`,
										error,
									);
								}

								return {
									name: oopTag.name,
									digest: manifest.digest,
									size: formatBytes(totalSize),
									lastUpdated,
									architectures,
									mediaType: manifest.mediaType,
								};
							} catch (error) {
								console.warn(`Failed to process tag ${oopTag.name}:`, error);
								return null;
							}
						});

						const batchResults = await Promise.allSettled(batchPromises);
						const successfulTags = batchResults
							.filter(
								(result): result is PromiseFulfilledResult<Tag | null> =>
									result.status === "fulfilled" && result.value !== null,
							)
							.map((result) => result.value as Tag);

						tags.push(...successfulTags);
					}

					const totalSize = calculateRepositorySize(tags);
					const architectures = [
						...new Set(
							tags.flatMap((tag) =>
								tag.architectures.map((arch) =>
									arch.variant
										? `${arch.architecture}/${arch.variant}`
										: arch.architecture,
								),
							),
						),
					];
					const latestTag =
						tags.length > 0
							? tags.reduce((latest, tag) =>
								new Date(tag.lastUpdated) > new Date(latest.lastUpdated)
									? tag
									: latest,
							)
							: null;

					const repositoryDetail: RepositoryDetail = {
						name,
						namespace,
						tagCount: oopTags.length,
						totalSize,
						totalSizeFormatted: formatBytes(totalSize),
						architectures,
						lastUpdated: latestTag?.lastUpdated || new Date().toISOString(),
						tags,
						createdAt: new Date().toISOString(),
						source: registryName,
					};

					set({
						repositoryDetails: {
							...state.repositoryDetails,
							[repoKey]: repositoryDetail,
						},
					});
				} catch (error) {
					console.error(
						`Failed to fetch repository detail for ${repoKey}:`,
						error,
					);
					set({
						error: `Failed to load repository details: ${error instanceof Error ? error.message : "Unknown error"}`,
					});
				}
			},

			startPeriodicRefresh: () => {
				if (refreshInterval) {
					clearInterval(refreshInterval);
				}
				if (manifestRefreshInterval) {
					clearInterval(manifestRefreshInterval);
				}
				if (visibilityChangeListener) {
					document.removeEventListener(
						"visibilitychange",
						visibilityChangeListener,
					);
				}

				refreshInterval = setInterval(() => {
					if (!document.hidden) {
						get().fetchRepositoryMetasLight();
					}
				}, 30000);

				manifestRefreshInterval = setInterval(() => {
					if (!document.hidden) {
						get().fetchRepositoryMetas();
					}
				}, 120000);

				visibilityChangeListener = () => {
					if (!document.hidden) {
						get().fetchRepositoryMetasLight();
					}
				};

				document.addEventListener("visibilitychange", visibilityChangeListener);
			},

			stopPeriodicRefresh: () => {
				if (refreshInterval) {
					clearInterval(refreshInterval);
					refreshInterval = null;
				}
				if (manifestRefreshInterval) {
					clearInterval(manifestRefreshInterval);
					manifestRefreshInterval = null;
				}
				if (visibilityChangeListener) {
					document.removeEventListener(
						"visibilitychange",
						visibilityChangeListener,
					);
					visibilityChangeListener = null;
				}
			},

			clearError: () => set({ error: null }),
			setHydrated: (hydrated: boolean) => set({ hydrated }),

			deleteRepository: async (
				name: string,
				namespace?: string,
				source?: string,
			) => {
				const repoKey = namespace ? `${namespace}/${name}` : name;
				const state = get();

				try {
					// Find the appropriate client
					let targetClient: ContainerRegistryClient;

					if (source) {
						const client = state.clients.find(
							(c) => c.registry.name === source,
						);
						if (!client) {
							throw new Error(
								`Registry client not found for source: ${source}`,
							);
						}
						targetClient = client;
					} else {
						// Find client based on existing repository metadata
						const existingRepo = state.repositoryMetas.find((repo) => {
							const existingKey = repo.namespace
								? `${repo.namespace}/${repo.name}`
								: repo.name;
							return existingKey === repoKey;
						});

						if (existingRepo?.source) {
							const client = state.clients.find(
								(c) => c.registry.name === existingRepo.source,
							);
							if (client) {
								targetClient = client;
							} else {
								targetClient = state.clients[0];
							}
						} else {
							targetClient = state.clients[0];
						}
					}

					if (!targetClient) {
						throw new Error("No registry clients available");
					}

					// Find the repository and get all its tags
					const repository = await targetClient.repository(name, namespace);
					if (!repository) {
						throw new Error(`Repository ${repoKey} not found`);
					}

					const tags = await repository.tags();
					let allDeleted = true;

					// Delete all tags in the repository
					for (const tag of tags) {
						try {
							const success = await tag.delete();
							if (!success) {
								allDeleted = false;
								console.warn(`Failed to delete tag ${tag.name}`);
							}
						} catch (error) {
							console.error(`Failed to delete tag ${tag.name}:`, error);
							allDeleted = false;
						}
					}

					if (allDeleted) {
						// Remove repository from local state since all tags are deleted
						set(
							produce((state: RepositoryStore) => {
								state.repositoryMetas = state.repositoryMetas.filter((repo) => {
									const currentRepoKey = repo.namespace
										? `${repo.namespace}/${repo.name}`
										: repo.name;
									return currentRepoKey !== repoKey;
								});
								delete state.repositoryDetails[repoKey];
							}),
						);
					}

					return allDeleted;
				} catch (error) {
					console.error("Failed to delete repository:", error);
					return false;
				}
			},

			deleteTag: async (
				repositoryName: string,
				tagName: string,
				namespace?: string,
				source?: string,
			) => {
				const repoKey = namespace
					? `${namespace}/${repositoryName}`
					: repositoryName;
				const state = get();

				try {
					// Find the appropriate client
					let targetClient: ContainerRegistryClient;

					if (source) {
						const client = state.clients.find(
							(c) => c.registry.name === source,
						);
						if (!client) {
							throw new Error(
								`Registry client not found for source: ${source}`,
							);
						}
						targetClient = client;
					} else {
						// Find client based on existing repository metadata
						const existingRepo = state.repositoryMetas.find((repo) => {
							const existingKey = repo.namespace
								? `${repo.namespace}/${repo.name}`
								: repo.name;
							return existingKey === repoKey;
						});

						if (existingRepo?.source) {
							const client = state.clients.find(
								(c) => c.registry.name === existingRepo.source,
							);
							if (client) {
								targetClient = client;
							} else {
								targetClient = state.clients[0];
							}
						} else {
							targetClient = state.clients[0];
						}
					}

					if (!targetClient) {
						throw new Error("No registry clients available");
					}

					// Find the repository and tag using OOP approach
					const repository = await targetClient.repository(
						repositoryName,
						namespace,
					);
					if (!repository) {
						throw new Error(`Repository ${repoKey} not found`);
					}

					const tag = await repository.tag(tagName);
					if (!tag) {
						// Tag doesn't exist, consider it successfully "deleted"
						return true;
					}

					// Delete the tag using OOP method
					// This will use DELETE /v2/<name>/manifests/<digest> with proper digest
					const success = await tag.delete();

					if (success) {
						// Update local state to remove the deleted tag
						set(
							produce((state: RepositoryStore) => {
								const repoDetail = state.repositoryDetails[repoKey];
								if (repoDetail) {
									repoDetail.tags = repoDetail.tags.filter(
										(tag) => tag.name !== tagName,
									);
									repoDetail.tagCount = repoDetail.tags.length;

									const repoIndex = state.repositoryMetas.findIndex((repo) => {
										const currentRepoKey = repo.namespace
											? `${repo.namespace}/${repo.name}`
											: repo.name;
										return currentRepoKey === repoKey;
									});
									if (repoIndex >= 0) {
										state.repositoryMetas[repoIndex].tagCount =
											repoDetail.tagCount;
									}
								}
							}),
						);
					}

					return success;
				} catch (error) {
					console.error("Failed to delete tag:", error);
					return false;
				}
			},
		}),
		{
			name: "repository-store",
			storage,
			partialize: (state) => ({
				repositoryMetas: state.repositoryMetas,
				repositoryDetails: state.repositoryDetails,
				sources: state.sources,
				statusCodes: state.statusCodes,
				lastFetch: state.lastFetch,
				availableArchitectures: state.availableArchitectures,
			}),
			onRehydrateStorage: () => (state) => {
				state?.setHydrated(true);
			},
		},
	),
);
