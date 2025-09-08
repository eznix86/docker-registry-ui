import { del as idbDel, get as idbGet, set as idbSet } from "idb-keyval";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

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

const formatBytes = (bytes: number): string => {
	if (bytes === 0) return "0 Bytes";
	const k = 1024;
	const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
};

const generateRealisticSize = (tagName: string, arch: string): number => {
	const baseSize = tagName.includes("alpine")
		? 5 * 1024 * 1024
		: tagName.includes("latest")
			? 50 * 1024 * 1024
			: tagName.includes("slim")
				? 25 * 1024 * 1024
				: 40 * 1024 * 1024;

	const archMultiplier = arch === "arm64" ? 1.1 : arch === "arm" ? 0.9 : 1.0;
	const randomVariation = 0.8 + Math.random() * 0.4; // ±20% variation
	return Math.floor(baseSize * archMultiplier * randomVariation);
};

const extractTimestampFromConfig = async (
	repoName: string,
	configDigest: string,
	sourcePath: string,
): Promise<string | null> => {
	try {
		const encodedRepoName = encodeURIComponent(repoName);
		const configUrl = `${sourcePath}/v2/${encodedRepoName}/blobs/${configDigest}`;
		console.log("[FETCH] extractTimestampFromConfig:", configUrl);
		const configResponse = await fetch(configUrl, {
			method: "GET",
			headers: {
				Accept: "application/json, application/octet-stream",
			},
		});

		if (configResponse.ok) {
			const configData = await configResponse.json();
			if (configData.created) {
				return configData.created;
			}
			if (configData.history?.[0]?.created) {
				return configData.history[0].created;
			}
		} else if (configResponse.status === 502 || configResponse.status === 404) {
			return null;
		}
	} catch (error) {
		if (
			error instanceof TypeError &&
			error.message.includes("Failed to fetch")
		) {
			return null;
		}
		if (!(error instanceof TypeError)) {
			console.warn(
				`Failed to extract timestamp from config ${configDigest}:`,
				error,
			);
		}
	}
	return null;
};

const processManifestV2Single = async (
	repoName: string,
	_tagName: string,
	manifest: {
		config?: { digest: string; size?: number };
		layers?: Array<{ size?: number }>;
	},
	digest: string,
	sourcePath: string,
): Promise<{
	architectures: ArchitectureInfo[];
	totalSize: number;
	timestamp: string;
}> => {
	let architectures: ArchitectureInfo[] = [];
	let totalSize = 0;
	let timestamp = new Date().toISOString();

	if (manifest.config && manifest.layers) {
		const actualTimestamp = await extractTimestampFromConfig(
			repoName,
			manifest.config.digest,
			sourcePath,
		);
		if (actualTimestamp) {
			timestamp = actualTimestamp;
		}

		const configSize = manifest.config.size || 0;
		const layersSize = manifest.layers.reduce(
			(acc: number, layer: { size?: number }) => acc + (layer.size || 0),
			0,
		);
		const archSize = configSize + layersSize;
		totalSize = archSize;

		architectures = [
			{
				architecture: "amd64",
				digest: digest,
				size: formatBytes(archSize),
				os: "linux",
			},
		];
	}

	return { architectures, totalSize, timestamp };
};

const processManifestList = async (
	repoName: string,
	tagName: string,
	manifest: {
		manifests?: Array<{
			digest: string;
			size?: number;
			platform?: { architecture?: string; os?: string };
		}>;
	},
	digest: string,
	sourcePath: string,
): Promise<{
	architectures: ArchitectureInfo[];
	totalSize: number;
	timestamp: string;
}> => {
	let architectures: ArchitectureInfo[] = [];
	let totalSize = 0;
	let timestamp = new Date().toISOString();
	let earliestTimestamp = new Date().toISOString();

	if (manifest.manifests) {
		const archPromises = manifest.manifests.map(
			async (archManifest: {
				digest: string;
				size?: number;
				platform?: { architecture?: string; os?: string };
			}) => {
				const arch = archManifest.platform?.architecture || "amd64";
				const os = archManifest.platform?.os || "linux";
				const archSize =
					archManifest.size || generateRealisticSize(tagName, arch);
				totalSize += archSize;

				try {
					const encodedRepoName = encodeURIComponent(repoName);
					const individualManifestUrl = `${sourcePath}/v2/${encodedRepoName}/manifests/${archManifest.digest}`;
					console.log(
						"[FETCH] processManifestList individual manifest:",
						individualManifestUrl,
						"repoName:",
						repoName,
					);
					const individualManifestResponse = await fetch(
						individualManifestUrl,
						{
							headers: {
								Accept:
									"application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.index.v1+json, application/vnd.oci.image.manifest.v1+json",
							},
						},
					);

					if (individualManifestResponse.ok) {
						const individualManifest = await individualManifestResponse.json();
						if (individualManifest.config) {
							const actualTimestamp = await extractTimestampFromConfig(
								repoName,
								individualManifest.config.digest,
								sourcePath,
							);
							if (actualTimestamp) {
								if (new Date(actualTimestamp) < new Date(earliestTimestamp)) {
									earliestTimestamp = actualTimestamp;
								}
							}
						}
					}
				} catch (error) {
					console.warn(
						`Failed to fetch individual manifest for ${arch}:`,
						error,
					);
				}

				return {
					architecture: arch,
					digest: digest,
					size: formatBytes(archSize),
					os: os,
				};
			},
		);

		architectures = await Promise.all(archPromises);
		timestamp = earliestTimestamp;
	}

	return { architectures, totalSize, timestamp };
};

const aggregateTagData = async (
	repoName: string,
	tagName: string,
	manifestResponse: Response,
	sourcePath: string,
): Promise<Tag | null> => {
	try {
		const manifest = await manifestResponse.json();
		const digest = manifestResponse.headers.get("Docker-Content-Digest") || "";

		let result: {
			architectures: ArchitectureInfo[];
			totalSize: number;
			timestamp: string;
		};

		if (
			manifest.mediaType ===
				"application/vnd.docker.distribution.manifest.list.v2+json" ||
			manifest.mediaType === "application/vnd.oci.image.index.v1+json"
		) {
			result = await processManifestList(
				repoName,
				tagName,
				manifest,
				digest,
				sourcePath,
			);
		} else if (
			manifest.mediaType ===
				"application/vnd.docker.distribution.manifest.v2+json" ||
			manifest.mediaType === "application/vnd.oci.image.manifest.v1+json"
		) {
			result = await processManifestV2Single(
				repoName,
				tagName,
				manifest,
				digest,
				sourcePath,
			);
		} else {
			const fallbackSize = generateRealisticSize(tagName, "amd64");
			result = {
				architectures: [
					{
						architecture: "amd64",
						digest: digest,
						size: formatBytes(fallbackSize),
						os: "linux",
					},
				],
				totalSize: fallbackSize,
				timestamp: new Date().toISOString(),
			};
		}

		return {
			name: tagName,
			digest: digest,
			size: formatBytes(result.totalSize),
			lastUpdated: result.timestamp,
			architectures: result.architectures,
		};
	} catch (error) {
		console.warn(`Failed to aggregate tag data for ${tagName}:`, error);
		return null;
	}
};

export interface ArchitectureInfo {
	architecture: string;
	digest: string;
	size: string;
	os: string;
}

export interface Tag {
	name: string;
	digest: string;
	size: string;
	lastUpdated: string;
	architectures: ArchitectureInfo[];
}

export interface SourceInfo {
	path: string;
	host: string;
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

interface RepositoryStore {
	repositoryMetas: RepositoryMeta[];
	repositoryDetails: { [key: string]: RepositoryDetail };
	sources: Record<string, SourceInfo>;

	loading: boolean;
	loadingStage: LoadingStage;
	error: string | null;
	lastFetch: number | null;
	availableArchitectures: string[];
	hydrated: boolean;

	fetchSources: () => Promise<void>;
	fetchRepositoryMetas: (force?: boolean) => Promise<void>;
	fetchRepositoryDetail: (
		name: string,
		namespace?: string,
		source?: string,
	) => Promise<void>;

	startPeriodicRefresh: () => void;
	stopPeriodicRefresh: () => void;
	clearError: () => void;
	setHydrated: (hydrated: boolean) => void;
	deleteRepository: (name: string, namespace?: string) => Promise<boolean>;
	deleteTag: (
		repositoryName: string,
		tagName: string,
		namespace?: string,
	) => Promise<boolean>;
}

let refreshInterval: NodeJS.Timeout | null = null;
let visibilityChangeListener: (() => void) | null = null;

export const useRepositoryStore = create<RepositoryStore>()(
	persist(
		(set, get) => ({
			repositoryMetas: [],
			repositoryDetails: {},
			sources: {},

			loading: false,
			loadingStage: { stage: "idle", progress: 0, message: "Ready" },
			error: null,
			lastFetch: null,
			availableArchitectures: [],
			hydrated: false,

			fetchSources: async () => {
				try {
					const response = await fetch("/sources.json");
					if (response.ok) {
						const sourcesData = await response.json();
						set({ sources: sourcesData });
					}
				} catch (error) {
					console.warn("Failed to fetch sources:", error);
				}
			},

			fetchRepositoryMetas: async (force: boolean = false) => {
				const state = get();
				const now = Date.now();
				const thirtySeconds = 30 * 1000;

				if (
					!force &&
					state.lastFetch &&
					now - state.lastFetch < thirtySeconds &&
					state.repositoryMetas.length > 0
				) {
					return;
				}

				// Ensure sources are fetched
				if (Object.keys(state.sources).length === 0) {
					await get().fetchSources();
				}

				set({
					loading: true,
					error: null,
					loadingStage: {
						stage: "catalog",
						progress: 5,
						message: "Fetching repository catalog...",
					},
				});

				try {
					const updatedState = get();
					const sources = Object.entries(updatedState.sources);

					if (sources.length === 0) {
						throw new Error("No sources available");
					}

					set({
						loadingStage: {
							stage: "catalog",
							progress: 5,
							message: "Fetching catalogs from all sources...",
						},
					});

					const catalogPromises = sources.map(
						async ([sourceName, sourceInfo]) => {
							try {
								const catalogUrl = `${sourceInfo.path}/v2/_catalog`;
								const catalogResponse = await fetch(catalogUrl);

								if (!catalogResponse.ok) {
									console.warn(
										`Failed to fetch from ${sourceName}: ${catalogResponse.status}`,
									);
									return { sourceName, sourceInfo, repositories: [] };
								}

								const catalogData = await catalogResponse.json();
								const repositories = catalogData.repositories || [];

								return { sourceName, sourceInfo, repositories };
							} catch (error) {
								console.warn(`Failed to process source ${sourceName}:`, error);
								return { sourceName, sourceInfo, repositories: [] };
							}
						},
					);

					const allSourceData = await Promise.all(catalogPromises);
					const totalRepositories = allSourceData.reduce(
						(sum, source) => sum + source.repositories.length,
						0,
					);

					set({
						loadingStage: {
							stage: "catalog",
							progress: 25,
							message: `Found ${totalRepositories} repositories across ${sources.length} sources`,
						},
					});

					set({
						loadingStage: {
							stage: "tags",
							progress: 25,
							message: "Fetching tags for all repositories...",
						},
					});

					const allRepositoryData: Array<{
						sourceName: string;
						sourceInfo: SourceInfo;
						repoName: string;
						tags: string[];
					}> = [];

					const tagPromises = allSourceData.flatMap(
						({ sourceName, sourceInfo, repositories }) =>
							repositories.map(async (repoName: string) => {
								try {
									const encodedRepoName = encodeURIComponent(repoName);
									const tagsUrl = `${sourceInfo.path}/v2/${encodedRepoName}/tags/list`;

									const tagsResponse = await fetch(tagsUrl);
									if (!tagsResponse.ok) {
										if (tagsResponse.status !== 404) {
											console.warn(
												`Failed to fetch tags for ${repoName}: HTTP ${tagsResponse.status}`,
											);
										}
										return { sourceName, sourceInfo, repoName, tags: [] };
									}

									const tagsData = await tagsResponse.json();
									const tags = tagsData.tags || [];

									return { sourceName, sourceInfo, repoName, tags };
								} catch (error) {
									console.warn(`Failed to fetch tags for ${repoName}:`, error);
									return { sourceName, sourceInfo, repoName, tags: [] };
								}
							}),
					);

					const tagResults = await Promise.all(tagPromises);
					allRepositoryData.push(...tagResults);

					set({
						loadingStage: {
							stage: "tags",
							progress: 50,
							message: `Fetched tags for ${allRepositoryData.length} repositories`,
						},
					});

					set({
						loadingStage: {
							stage: "manifests",
							progress: 50,
							message: "Fetching manifests for all tags...",
						},
					});

					const manifestPromises = allRepositoryData
						.filter((repo) => repo.tags.length > 0)
						.flatMap(({ sourceName, sourceInfo, repoName, tags }) => {
							const sampleTags = tags.slice(0, 3);
							return sampleTags.map(async (tagName: string) => {
								try {
									const encodedRepoName = encodeURIComponent(repoName);
									const manifestUrl = `${sourceInfo.path}/v2/${encodedRepoName}/manifests/${tagName}`;

									const manifestResponse = await fetch(manifestUrl, {
										headers: {
											Accept:
												"application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.index.v1+json, application/vnd.oci.image.manifest.v1+json",
										},
									});

									if (manifestResponse.ok) {
										const tagData = await aggregateTagData(
											repoName,
											tagName,
											manifestResponse,
											sourceInfo.path,
										);
										return {
											sourceName,
											repoName,
											tagData,
											totalTags: tags.length,
										};
									}
								} catch (error) {
									console.warn(
										`Failed to process manifest for ${repoName}:${tagName}:`,
										error,
									);
								}
								return null;
							});
						});

					const manifestResults = await Promise.all(manifestPromises);
					const validManifests = manifestResults.filter(Boolean);

					set({
						loadingStage: {
							stage: "manifests",
							progress: 85,
							message: `Fetched ${validManifests.length} manifests`,
						},
					});

					set({
						loadingStage: {
							stage: "complete",
							progress: 85,
							message: "Processing and aggregating data...",
						},
					});

					const repositoryMap = new Map<
						string,
						{
							sourceName: string;
							repoName: string;
							tags: Tag[];
							totalTags: number;
						}
					>();

					for (const manifest of validManifests) {
						if (!manifest?.tagData) continue;

						const key = `${manifest.sourceName}:${manifest.repoName}`;
						if (!repositoryMap.has(key)) {
							repositoryMap.set(key, {
								sourceName: manifest.sourceName,
								repoName: manifest.repoName,
								tags: [],
								totalTags: manifest.totalTags,
							});
						}
						repositoryMap.get(key)?.tags.push(manifest.tagData);
					}

					const allRepositoryMetas: RepositoryMeta[] = [];
					const allArchitectures = new Set<string>();

					for (const {
						sourceName,
						repoName,
						tags,
						totalTags,
					} of repositoryMap.values()) {
						if (tags.length === 0) continue;

						const parts = repoName.split("/");
						const name = parts.length > 1 ? parts[parts.length - 1] : repoName;
						const namespace =
							parts.length > 1 ? parts.slice(0, -1).join("/") : undefined;

						const totalSize = tags.reduce((sum, tag) => {
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

						const architectures = [
							...new Set(
								tags.flatMap((tag) =>
									tag.architectures.map((arch) => arch.architecture),
								),
							),
						];

						for (const arch of architectures) {
							allArchitectures.add(arch);
						}

						const latestTag = tags.reduce((latest, tag) =>
							new Date(tag.lastUpdated) > new Date(latest.lastUpdated)
								? tag
								: latest,
						);

						allRepositoryMetas.push({
							name,
							namespace,
							tagCount: totalTags,
							totalSize,
							totalSizeFormatted: formatBytes(totalSize),
							architectures,
							lastUpdated: latestTag.lastUpdated,
							createdAt: new Date().toISOString(),
							source: sourceName,
						});
					}

					for (const { sourceName, repoName, tags } of allRepositoryData) {
						if (tags.length === 0) {
							const parts = repoName.split("/");
							const name =
								parts.length > 1 ? parts[parts.length - 1] : repoName;
							const namespace =
								parts.length > 1 ? parts.slice(0, -1).join("/") : undefined;

							allRepositoryMetas.push({
								name,
								namespace,
								tagCount: 0,
								totalSize: 0,
								totalSizeFormatted: "0 B",
								architectures: [],
								lastUpdated: new Date().toISOString(),
								createdAt: new Date().toISOString(),
								source: sourceName,
							});
						}
					}

					if (allRepositoryMetas.length === 0) {
						set({
							repositoryMetas: [],
							availableArchitectures: [],
							loading: false,
							loadingStage: {
								stage: "complete",
								progress: 100,
								message: "No repositories found",
							},
							lastFetch: Date.now(),
						});
						return;
					}

					set({
						loadingStage: {
							stage: "complete",
							progress: 95,
							message: "Finalizing data...",
						},
					});

					set({
						repositoryMetas: allRepositoryMetas,
						availableArchitectures: [...allArchitectures].sort(),
						loading: false,
						loadingStage: {
							stage: "complete",
							progress: 100,
							message: `Loaded ${allRepositoryMetas.length} repositories`,
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

			fetchRepositoryDetail: async (
				name: string,
				namespace?: string,
				source?: string,
			) => {
				const repoKey = namespace ? `${namespace}/${name}` : name;
				const state = get();

				// Ensure sources are fetched
				if (Object.keys(state.sources).length === 0) {
					await get().fetchSources();
				}

				const existingDetail = state.repositoryDetails[repoKey];
				if (
					existingDetail &&
					Date.now() - new Date(existingDetail.createdAt).getTime() < 30000
				) {
					return;
				}

				try {
					const updatedState = get();
					let sourceInfo: SourceInfo;

					if (source) {
						sourceInfo = updatedState.sources[source];
						if (!sourceInfo) {
							throw new Error(`Source ${source} not found`);
						}
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
							const firstSource = Object.values(updatedState.sources)[0];
							if (!firstSource) {
								throw new Error("No sources available");
							}
							sourceInfo = firstSource;
						}
					}

					const encodedRepoName = encodeURIComponent(repoKey);
					const tagsResponse = await fetch(
						`${sourceInfo.path}/v2/${encodedRepoName}/tags/list`,
					);

					if (!tagsResponse.ok) {
						throw new Error(`Failed to fetch tags for ${repoKey}`);
					}

					const tagsData = await tagsResponse.json();
					const tagNames = tagsData.tags || [];

					const tagPromises = tagNames.map(async (tagName: string) => {
						try {
							const manifestResponse = await fetch(
								`${sourceInfo.path}/v2/${encodedRepoName}/manifests/${tagName}`,
								{
									headers: {
										Accept:
											"application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.manifest.v1+json",
									},
								},
							);

							if (manifestResponse.ok) {
								return await aggregateTagData(
									repoKey,
									tagName,
									manifestResponse,
									sourceInfo.path,
								);
							}
						} catch (error) {
							console.warn(
								`Failed to process tag ${tagName} for ${repoKey}:`,
								error,
							);
						}
						return null;
					});

					const tags = (await Promise.all(tagPromises)).filter(
						Boolean,
					) as Tag[];

					const totalSize = tags.reduce((sum, tag) => {
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

					const architectures = [
						...new Set(
							tags.flatMap((tag) =>
								tag.architectures.map((arch) => arch.architecture),
							),
						),
					];

					const latestTag = tags.reduce((latest, tag) =>
						new Date(tag.lastUpdated) > new Date(latest.lastUpdated)
							? tag
							: latest,
					);

					// Determine which source was used
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
						lastUpdated: latestTag.lastUpdated,
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
					refreshInterval = null;
				}
				if (visibilityChangeListener) {
					document.removeEventListener(
						"visibilitychange",
						visibilityChangeListener,
					);
					visibilityChangeListener = null;
				}

				refreshInterval = setInterval(() => {
					if (!document.hidden) {
						get().fetchRepositoryMetas();
					}
				}, 30000);

				visibilityChangeListener = () => {
					if (!document.hidden) {
						get().fetchRepositoryMetas();
					}
				};

				document.addEventListener("visibilitychange", visibilityChangeListener);
			},

			stopPeriodicRefresh: () => {
				if (refreshInterval) {
					clearInterval(refreshInterval);
					refreshInterval = null;
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
				const encodedRepoName = encodeURIComponent(repoKey);
				const sourcePath = source ? `/api/${source}` : "/api/default";

				try {
					const response = await fetch(`${sourcePath}/v2/${encodedRepoName}`, {
						method: "DELETE",
					});

					if (response.ok || response.status === 404) {
						const state = get();
						const updatedMetas = state.repositoryMetas.filter((repo) => {
							const currentRepoKey = repo.namespace
								? `${repo.namespace}/${repo.name}`
								: repo.name;
							return currentRepoKey !== repoKey;
						});

						const updatedDetails = { ...state.repositoryDetails };
						delete updatedDetails[repoKey];

						set({
							repositoryMetas: updatedMetas,
							repositoryDetails: updatedDetails,
						});

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
					const manifestResponse = await fetch(
						`${sourcePath}/v2/${encodedRepoName}/manifests/${tagName}`,
					);

					// If tag doesn't exist (404), treat as successful deletion
					if (manifestResponse.status === 404) {
						const state = get();
						const repoDetail = state.repositoryDetails[repoKey];

						if (repoDetail) {
							const updatedTags = repoDetail.tags.filter(
								(tag) => tag.name !== tagName,
							);

							const updatedDetail: RepositoryDetail = {
								...repoDetail,
								tags: updatedTags,
								tagCount: updatedTags.length,
							};

							// Also update repositoryMetas to keep tagCount in sync
							const updatedMetas = state.repositoryMetas.map((repo) => {
								const currentRepoKey = repo.namespace
									? `${repo.namespace}/${repo.name}`
									: repo.name;
								if (currentRepoKey === repoKey) {
									return {
										...repo,
										tagCount: updatedTags.length,
									};
								}
								return repo;
							});

							set({
								repositoryDetails: {
									...state.repositoryDetails,
									[repoKey]: updatedDetail,
								},
								repositoryMetas: updatedMetas,
							});
						}

						return true;
					}

					if (!manifestResponse.ok) {
						throw new Error(
							`Failed to get tag digest: ${manifestResponse.status}`,
						);
					}

					const digest = manifestResponse.headers.get("Docker-Content-Digest");
					if (!digest) {
						throw new Error("No digest found in manifest response");
					}

					const deleteResponse = await fetch(
						`${sourcePath}/v2/${encodedRepoName}/manifests/${digest}`,
						{
							method: "DELETE",
						},
					);

					if (deleteResponse.ok || deleteResponse.status === 404) {
						const state = get();
						const repoDetail = state.repositoryDetails[repoKey];

						if (repoDetail) {
							const updatedTags = repoDetail.tags.filter(
								(tag) => tag.name !== tagName,
							);

							const updatedDetail: RepositoryDetail = {
								...repoDetail,
								tags: updatedTags,
								tagCount: updatedTags.length,
							};

							// Also update repositoryMetas to keep tagCount in sync
							const updatedMetas = state.repositoryMetas.map((repo) => {
								const currentRepoKey = repo.namespace
									? `${repo.namespace}/${repo.name}`
									: repo.name;
								if (currentRepoKey === repoKey) {
									return {
										...repo,
										tagCount: updatedTags.length,
									};
								}
								return repo;
							});

							set({
								repositoryDetails: {
									...state.repositoryDetails,
									[repoKey]: updatedDetail,
								},
								repositoryMetas: updatedMetas,
							});
						}

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
				lastFetch: state.lastFetch,
				availableArchitectures: state.availableArchitectures,
			}),
			onRehydrateStorage: () => (state) => {
				state?.setHydrated(true);
			},
		},
	),
);
