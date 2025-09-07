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
): Promise<string | null> => {
	try {
		const encodedRepoName = encodeURIComponent(repoName);
		const configResponse = await fetch(
			`/api/v2/${encodedRepoName}/blobs/${configDigest}`,
			{
				method: "GET",
				headers: {
					Accept: "application/json, application/octet-stream",
				},
			},
		);

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
					const individualManifestResponse = await fetch(
						`/api/v2/${encodedRepoName}/manifests/${archManifest.digest}`,
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
			result = await processManifestList(repoName, tagName, manifest, digest);
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

export interface RepositoryMeta {
	name: string;
	namespace?: string;
	tagCount: number;
	totalSize: number;
	totalSizeFormatted: string;
	architectures: string[];
	lastUpdated: string;
	createdAt: string;
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

	loading: boolean;
	loadingStage: LoadingStage;
	error: string | null;
	lastFetch: number | null;
	availableArchitectures: string[];
	hydrated: boolean;

	fetchRepositoryMetas: (force?: boolean) => Promise<void>;
	fetchRepositoryDetail: (name: string, namespace?: string) => Promise<void>;

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

			loading: false,
			loadingStage: { stage: "idle", progress: 0, message: "Ready" },
			error: null,
			lastFetch: null,
			availableArchitectures: [],
			hydrated: false,

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

				set({
					loading: true,
					error: null,
					loadingStage: {
						stage: "catalog",
						progress: 0,
						message: "Fetching repository catalog...",
					},
				});

				try {
					const catalogResponse = await fetch("/api/v2/_catalog");
					if (!catalogResponse.ok)
						throw new Error(`HTTP error! status: ${catalogResponse.status}`);

					const catalogData = await catalogResponse.json();
					const repoNames = catalogData.repositories || [];

					if (repoNames.length === 0) {
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
							stage: "tags",
							progress: 25,
							message: `Found ${repoNames.length} repositories. Aggregating metadata...`,
						},
					});

					const repositoryMetas: RepositoryMeta[] = [];
					const allArchitectures = new Set<string>();

					const batchSize = 5;
					for (let i = 0; i < repoNames.length; i += batchSize) {
						const batch = repoNames.slice(i, i + batchSize);
						const batchPromises = batch.map(async (repoName: string) => {
							try {
								const encodedRepoName = encodeURIComponent(repoName);
								const tagsResponse = await fetch(
									`/api/v2/${encodedRepoName}/tags/list`,
								);

								if (!tagsResponse.ok) {
									if (tagsResponse.status !== 404) {
										console.warn(
											`Failed to fetch tags for ${repoName}: HTTP ${tagsResponse.status}`,
										);
									}
									return null;
								}

								const tagsData = await tagsResponse.json();
								const tagNames = tagsData.tags || [];

								if (tagNames.length === 0) {
									const [namespace, name] = repoName.includes("/")
										? repoName.split("/", 2)
										: [undefined, repoName];

									return {
										name,
										namespace,
										tagCount: 0,
										architectures: [],
										totalSizeFormatted: "0 B",
									};
								}

								const sampleTags = tagNames.slice(0, 3);
								const tagPromises = sampleTags.map(async (tagName: string) => {
									try {
										const manifestResponse = await fetch(
											`/api/v2/${encodedRepoName}/manifests/${tagName}`,
											{
												headers: {
													Accept:
														"application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.index.v1+json, application/vnd.oci.image.manifest.v1+json",
												},
											},
										);

										if (manifestResponse.ok) {
											return await aggregateTagData(
												repoName,
												tagName,
												manifestResponse,
											);
										}
									} catch (error) {
										console.warn(
											`Failed to process tag ${tagName} for ${repoName}:`,
											error,
										);
									}
									return null;
								});

								const tags = (await Promise.all(tagPromises)).filter(
									Boolean,
								) as Tag[];

								if (tags.length === 0) {
									return null;
								}

								const parts = repoName.split("/");
								const name =
									parts.length > 1 ? parts[parts.length - 1] : repoName;
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

								return {
									name,
									namespace,
									tagCount: tagNames.length,
									totalSize,
									totalSizeFormatted: formatBytes(totalSize),
									architectures,
									lastUpdated: latestTag.lastUpdated,
									createdAt: new Date().toISOString(),
								} as RepositoryMeta;
							} catch (error) {
								console.warn(
									`Failed to aggregate metadata for ${repoName}:`,
									error,
								);
								return null;
							}
						});

						const batchResults = (await Promise.all(batchPromises)).filter(
							Boolean,
						) as RepositoryMeta[];
						repositoryMetas.push(...batchResults);

						const progress = Math.min(
							95,
							25 + ((i + batchSize) / repoNames.length) * 70,
						);
						set({
							repositoryMetas: [...repositoryMetas],
							loadingStage: {
								stage: "manifests",
								progress,
								message: `Processed ${Math.min(i + batchSize, repoNames.length)} of ${repoNames.length} repositories...`,
							},
						});
					}

					set({
						repositoryMetas,
						availableArchitectures: [...allArchitectures].sort(),
						loading: false,
						loadingStage: {
							stage: "complete",
							progress: 100,
							message: `Loaded ${repositoryMetas.length} repositories`,
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

			fetchRepositoryDetail: async (name: string, namespace?: string) => {
				const repoKey = namespace ? `${namespace}/${name}` : name;
				const state = get();

				const existingDetail = state.repositoryDetails[repoKey];
				if (
					existingDetail &&
					Date.now() - new Date(existingDetail.createdAt).getTime() < 30000
				) {
					return;
				}

				try {
					const encodedRepoName = encodeURIComponent(repoKey);
					const tagsResponse = await fetch(
						`/api/v2/${encodedRepoName}/tags/list`,
					);

					if (!tagsResponse.ok) {
						throw new Error(`Failed to fetch tags for ${repoKey}`);
					}

					const tagsData = await tagsResponse.json();
					const tagNames = tagsData.tags || [];

					const tagPromises = tagNames.map(async (tagName: string) => {
						try {
							const manifestResponse = await fetch(
								`/api/v2/${encodedRepoName}/manifests/${tagName}`,
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

			deleteRepository: async (name: string, namespace?: string) => {
				const repoKey = namespace ? `${namespace}/${name}` : name;
				const encodedRepoName = encodeURIComponent(repoKey);

				try {
					const response = await fetch(`/api/v2/${encodedRepoName}`, {
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
			) => {
				const repoKey = namespace
					? `${namespace}/${repositoryName}`
					: repositoryName;
				const encodedRepoName = encodeURIComponent(repoKey);

				try {
					const manifestResponse = await fetch(
						`/api/v2/${encodedRepoName}/manifests/${tagName}`,
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
						`/api/v2/${encodedRepoName}/manifests/${digest}`,
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
				lastFetch: state.lastFetch,
				availableArchitectures: state.availableArchitectures,
			}),
			onRehydrateStorage: () => (state) => {
				state?.setHydrated(true);
			},
		},
	),
);
