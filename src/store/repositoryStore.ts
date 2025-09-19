import { del as idbDel, get as idbGet, set as idbSet } from "idb-keyval";
import { produce } from "immer";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface ArchitectureInfo {
	architecture: string;
	digest: string;
	size: string;
	os: string;
}

interface ManifestReference {
	digest: string;
	annotations?: {
		[key: string]: string;
	};
	platform?: {
		architecture: string;
		os: string;
	};
}

interface HistoryEntry {
	v1Compatibility?: string;
}

export interface Tag {
	name: string;
	digest: string;
	size: string;
	lastUpdated: string;
	architectures: ArchitectureInfo[];
	mediaType: string;
}

export interface SourceInfo {
	path: string;
	host: string;
	status?: number;
	lastChecked?: number;
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

async function fetchManifest(
	repoName: string,
	tagName: string,
	sourcePath: string,
): Promise<Response> {
	const url = `${sourcePath}/v2/${encodeURIComponent(repoName)}/manifests/${tagName}`;
	const response = await fetchWithTimeout(url, {
		headers: {
			Accept:
				"application/vnd.oci.image.index.v1+json, application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.manifest.v1+json, application/vnd.docker.distribution.manifest.v1+json",
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

async function processManifest(
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
					},
				];
			}
		} else if (
			manifest.mediaType ===
			"application/vnd.docker.distribution.manifest.v1+json"
		) {
			if (manifest.fsLayers && manifest.history) {
				try {
					const layerPromises = manifest.fsLayers.map(
						async (layer: { blobSum: string }) => {
							try {
								const blobResponse = await fetchWithTimeout(
									`${sourcePath}/v2/${repoName}/blobs/${layer.blobSum}`,
									{ method: "HEAD" },
								);
								if (blobResponse.ok) {
									const contentLength =
										blobResponse.headers.get("Content-Length");
									if (contentLength) {
										return parseInt(contentLength, 10);
									}
								}
							} catch (error) {
								console.warn(
									`Failed to fetch layer size for ${layer.blobSum}:`,
									error,
								);
							}
							return 0;
						},
					);

					const layerSizes = await Promise.all(layerPromises);
					const totalLayerSize = layerSizes.reduce(
						(sum, size) => sum + size,
						0,
					);

					const configSize =
						manifest.history?.reduce((acc: number, entry: HistoryEntry) => {
							if (entry.v1Compatibility) {
								return acc + JSON.stringify(entry.v1Compatibility).length;
							}
							return acc;
						}, 0) || 0;

					totalSize = totalLayerSize + configSize;

					let detectedArch = "amd64";
					let detectedOs = "linux";

					try {
						if (manifest.history && manifest.history.length > 0) {
							const latestHistory = manifest.history[0];
							if (latestHistory.v1Compatibility) {
								const v1Compat = JSON.parse(latestHistory.v1Compatibility);
								if (v1Compat.architecture) {
									detectedArch = v1Compat.architecture;
								}
								if (v1Compat.os) {
									detectedOs = v1Compat.os;
								}
							}
						}
					} catch (error) {
						console.warn(
							"Failed to parse v1Compatibility for architecture:",
							error,
						);
					}

					architectures = [
						{
							architecture: manifest.architecture || detectedArch,
							digest: digest,
							size: formatBytes(totalSize),
							os: detectedOs,
						},
					];
				} catch (error) {
					console.warn("Failed to process Docker v1 manifest:", error);

					totalSize = 0;
					architectures = [
						{
							architecture: manifest.architecture || "amd64",
							digest: digest,
							size: "Unknown",
							os: "linux",
						},
					];
				}
			} else {
				totalSize = 0;
				architectures = [
					{
						architecture: manifest.architecture || "amd64",
						digest: digest,
						size: "Unknown",
						os: "linux",
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

export const useRepositoryStore = create<RepositoryStore>()(
	persist(
		(set, get) => ({
			repositoryMetas: [],
			repositoryDetails: {},
			sources: {},
			statusCodes: {},
			loading: false,
			loadingStage: { stage: "idle", progress: 0, message: "Ready" },
			error: null,
			lastFetch: null,
			availableArchitectures: [],
			hydrated: false,

			fetchSources: async () => {
				const sourcesData = await fetchSources();
				if (Object.keys(sourcesData).length > 0) {
					set({ sources: sourcesData });
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

				if (Object.keys(state.sources).length === 0) {
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
								return {
									sourceName,
									sourceInfo: updatedSourceInfo,
									repositories,
								};
							} catch (error) {
								console.warn(`Failed to fetch from ${sourceName}:`, error);
								let status = 0;
								if (error instanceof Error) {
									if (error.name === "AbortError") {
										status = 408;
									} else if (
										error.message.includes("Failed to fetch catalog:")
									) {
										status = 500;
									} else {
										status = 0;
									}
								}
								const updatedSourceInfo = {
									...sourceInfo,
									status,
									lastChecked: Date.now(),
								};
								return {
									sourceName,
									sourceInfo: updatedSourceInfo,
									repositories: [],
								};
							}
						},
					);

					const sourceResults = await Promise.all(sourcePromises);

					const updatedSources = { ...sources };
					for (const { sourceName, sourceInfo } of sourceResults) {
						updatedSources[sourceName] = sourceInfo;
					}
					set({ sources: updatedSources });

					const allRepos: Array<{
						sourceName: string;
						sourceInfo: SourceInfo;
						repoName: string;
					}> = [];

					for (const {
						sourceName,
						sourceInfo,
						repositories,
					} of sourceResults) {
						for (const repoName of repositories) {
							allRepos.push({ sourceName, sourceInfo, repoName });
						}
					}

					set({
						loadingStage: {
							stage: "tags",
							progress: 25,
							message: `Found ${allRepos.length} repositories from ${sourceResults.length} sources`,
						},
					});

					let totalReposProcessed = 0;
					const totalRepos = allRepos.length;

					const sourceTagPromises = sourceResults.map(
						async ({ sourceName, sourceInfo, repositories }) => {
							const reposWithTags: Array<{
								sourceName: string;
								sourceInfo: SourceInfo;
								repoName: string;
								tags: string[];
							}> = [];

							for (let i = 0; i < repositories.length; i++) {
								const repoName = repositories[i];
								try {
									const tags = await fetchTags(repoName, sourceInfo.path);
									reposWithTags.push({
										sourceName,
										sourceInfo,
										repoName,
										tags,
									});
								} catch (error) {
									console.warn(`Failed to fetch tags for ${repoName}:`, error);
									reposWithTags.push({
										sourceName,
										sourceInfo,
										repoName,
										tags: [],
									});
								}

								totalReposProcessed++;
								const globalProgress =
									25 + (totalReposProcessed / totalRepos) * 25;

								set({
									loadingStage: {
										stage: "tags",
										progress: Math.min(globalProgress, 50),
										message: `Processing tags: ${totalReposProcessed}/${totalRepos} repositories (${sourceName})`,
									},
								});
							}

							return reposWithTags;
						},
					);

					const sourceTagResults = await Promise.allSettled(sourceTagPromises);

					const reposWithTags = sourceTagResults
						.filter((result): result is PromiseFulfilledResult<Array<{
							sourceName: string;
							sourceInfo: SourceInfo;
							repoName: string;
							tags: string[];
						}>> => result.status === 'fulfilled')
						.flatMap(result => result.value);

					// Log any source failures
					const failedSources = sourceTagResults.filter(result => result.status === 'rejected');
					if (failedSources.length > 0) {
						console.warn(`${failedSources.length} registry sources failed during tag fetching`);
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
					const BATCH_SIZE = 10; // Process 10 repos at a time
					for (let i = 0; i < reposWithTags.length; i += BATCH_SIZE) {
						const batch = reposWithTags.slice(i, i + BATCH_SIZE);

						const batchPromises = batch.map(async (repo) => {
							const { sourceName, sourceInfo, repoName, tags } = repo;
							const { name, namespace } = parseRepositoryName(repoName);

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
									source: sourceName,
								};
							}

							const sampleTags = tags.slice(0, 2); // Reduced from 3 to 2 for speed
							const processedTags: Tag[] = [];

							// Process tags concurrently instead of sequentially
							const tagPromises = sampleTags.map(async (tagName) => {
								const manifestResponse = await fetchManifest(
									repoName,
									tagName,
									sourceInfo.path,
								);
								const tag = await processManifest(
									repoName,
									tagName,
									manifestResponse,
									sourceInfo.path,
								);
								return tag;
							});

							const tagResults = await Promise.allSettled(tagPromises);
							const successfulTags = tagResults
								.filter((result): result is PromiseFulfilledResult<Tag | null> =>
									result.status === 'fulfilled' && result.value !== null
								)
								.map(result => result.value as Tag);

							// Log rejected promises for debugging
							tagResults
								.filter((result): result is PromiseRejectedResult => result.status === 'rejected')
								.forEach((result, index) => {
									console.warn(`Failed to process ${repoName}:${sampleTags[index]}:`, result.reason);
								});

							processedTags.push(...successfulTags);


							if (processedTags.length > 0) {
								const totalSize = calculateRepositorySize(processedTags);
								const architectures = [
									...new Set(
										processedTags.flatMap((tag) =>
											tag.architectures.map((arch) => arch.architecture),
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
									source: sourceName,
								};
							}
							return null;
						});

						const batchResults = await Promise.allSettled(batchPromises);
						const validRepos = batchResults
							.filter((result): result is PromiseFulfilledResult<RepositoryMeta | null> =>
								result.status === 'fulfilled' && result.value !== null
							)
							.map(result => result.value as RepositoryMeta);

						// Log any batch processing failures
						const rejectedCount = batchResults.filter(result => result.status === 'rejected').length;
						if (rejectedCount > 0) {
							console.warn(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${rejectedCount} repositories failed to process`);
						}

						for (const repo of validRepos) {
							processedRepos.push(repo);
							for (const arch of repo.architectures) {
								allArchitectures.add(arch);
							}
						}

						// Update progress after each batch
						const completedRepos = Math.min(i + BATCH_SIZE, reposWithTags.length);
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

				if (Object.keys(state.sources).length === 0) {
					await get().fetchSources();
				}

				try {
					const updatedState = get();

					let sourceInfo: SourceInfo;
					if (source && updatedState.sources[source]) {
						sourceInfo = updatedState.sources[source];
					} else {
						const existingRepo = updatedState.repositoryMetas.find((repo) => {
							const existingKey = repo.namespace
								? `${repo.namespace}/${repo.name}`
								: repo.name;
							return existingKey === repoKey;
						});

						if (
							existingRepo?.source &&
							updatedState.sources[existingRepo.source]
						) {
							sourceInfo = updatedState.sources[existingRepo.source];
						} else {
							sourceInfo = Object.values(updatedState.sources)[0];
						}
					}

					if (!sourceInfo) {
						throw new Error("No sources available");
					}

					const tagNames = await fetchTags(repoKey, sourceInfo.path);
					const tags: Tag[] = [];

					for (const tagName of tagNames) {
						try {
							const manifestResponse = await fetchManifest(
								repoKey,
								tagName,
								sourceInfo.path,
							);
							const tag = await processManifest(
								repoKey,
								tagName,
								manifestResponse,
								sourceInfo.path,
							);
							if (tag) {
								tags.push(tag);
							}
						} catch (error) {
							console.warn(`Failed to process tag ${tagName}:`, error);
						}
					}

					const totalSize = calculateRepositorySize(tags);
					const architectures = [
						...new Set(
							tags.flatMap((tag) =>
								tag.architectures.map((arch) => arch.architecture),
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

					const usedSource =
						source ||
						Object.entries(updatedState.sources).find(
							([, info]) => info === sourceInfo,
						)?.[0] ||
						"default";

					const repositoryDetail: RepositoryDetail = {
						name,
						namespace,
						tagCount: tagNames.length,
						totalSize,
						totalSizeFormatted: formatBytes(totalSize),
						architectures,
						lastUpdated: latestTag?.lastUpdated || new Date().toISOString(),
						tags,
						createdAt: new Date().toISOString(),
						source: usedSource,
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
				const sourcePath = source ? `/api/${source}` : "/api/default";

				try {
					const response = await fetchWithTimeout(
						`${sourcePath}/v2/${encodeURIComponent(repoKey)}`,
						{
							method: "DELETE",
						},
					);

					if (response.ok || response.status === 404) {
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
						return true;
					}
					return false;
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
				const encodedRepoName = encodeURIComponent(repoKey);
				const sourcePath = source ? `/api/${source}` : "/api/default";

				try {
					const state = get();
					const repoDetail = state.repositoryDetails[repoKey];

					if (!repoDetail) {
						throw new Error("Repository not found in local cache");
					}

					const tag = repoDetail.tags.find((t) => t.name === tagName);
					if (!tag) {
						return true;
					}

					const deleteResponse = await fetchWithTimeout(
						`${sourcePath}/v2/${encodedRepoName}/manifests/${tag.digest}`,
						{
							method: "DELETE",
							headers: {
								Accept: tag.mediaType,
							},
						},
					);

					if (deleteResponse.ok || deleteResponse.status === 404) {
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
						return true;
					}
					return false;
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
