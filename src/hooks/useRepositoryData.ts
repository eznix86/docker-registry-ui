import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type {
	ContainerRegistryClient,
	Repository,
} from "../lib/container-registry";
import { useRepositoryStore, useShallow } from "../store/repositoryStore";


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

export interface Tag {
	name: string;
	digest: string;
	size: string;
	lastUpdated: string;
	architectures: Array<{
		architecture: string;
		digest: string;
		size: string;
		os: string;
		variant?: string;
	}>;
	mediaType: string;
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


function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 Bytes";
	const k = 1024;
	const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
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


export interface LoadingProgress {
	progress: number;
	message: string;
	currentStep: number;
	totalSteps: number;
}


async function fetchRepositories(
	clients: ContainerRegistryClient[],
	onProgress?: (progress: LoadingProgress) => void,
): Promise<RepositoryMeta[]> {
	if (clients.length === 0) {
		throw new Error("No registry clients available");
	}

	const allRepos: RepositoryMeta[] = [];
	let totalRepositories = 0;
	let processedRepositories = 0;


	onProgress?.({
		progress: 0,
		message: "Discovering repositories...",
		currentStep: 0,
		totalSteps: 0,
	});

	const clientRepos: Array<{
		client: ContainerRegistryClient;
		repos: Repository[];
	}> = [];
	for (const client of clients) {
		try {
			const repos = await client.repositories();
			totalRepositories += repos.length;
			clientRepos.push({ client, repos });
		} catch (error) {
			console.warn(`Failed to fetch from ${client.registry.name}:`, error);
		}
	}


	for (const { client, repos } of clientRepos) {
		try {

			for (const repo of repos) {
				processedRepositories++;
				const progress = (processedRepositories / totalRepositories) * 100;

				onProgress?.({
					progress,
					message: `Processing ${repo.fullName || repo.name} (${processedRepositories}/${totalRepositories})`,
					currentStep: processedRepositories,
					totalSteps: totalRepositories,
				});

				try {
					const tags = await repo.tags();


					const sampleTags = tags.slice(0, 2);
					const processedTags: Tag[] = [];

					for (const tag of sampleTags) {
						try {
							const manifest = await tag.manifest();
							const images = await manifest.images();

							if (images.length === 0) continue;

							const architectures = images.map(
								(image) => image.architectureInfo,
							);


							let totalSize = 0;
							if (manifest.isMultiPlatform()) {
								totalSize = images.reduce((sum, image) => sum + image.size, 0);
							} else {
								totalSize = images[0].size;
							}


							let lastUpdated = new Date().toISOString();
							try {
								const configBlob = await images[0].config.blob();
								if (configBlob.created) {
									lastUpdated = configBlob.created;
								}
							} catch (_error) {

							}

							processedTags.push({
								name: tag.name,
								digest: manifest.digest,
								size: formatBytes(totalSize),
								lastUpdated,
								architectures,
								mediaType: manifest.mediaType,
							});
						} catch (error) {
							console.warn(`Failed to process tag ${tag.name}:`, error);
						}
					}

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

						allRepos.push({
							name: repo.name,
							namespace: repo.namespace,
							tagCount: tags.length,
							totalSize,
							totalSizeFormatted: formatBytes(totalSize),
							architectures,
							lastUpdated: latestTag.lastUpdated,
							createdAt: new Date().toISOString(),
							source: client.registry.name,
						});
					} else {

						allRepos.push({
							name: repo.name,
							namespace: repo.namespace,
							tagCount: 0,
							totalSize: 0,
							totalSizeFormatted: "0 B",
							architectures: [],
							lastUpdated: new Date().toISOString(),
							createdAt: new Date().toISOString(),
							source: client.registry.name,
						});
					}
				} catch (error) {
					console.warn(`Failed to process repository ${repo.fullName}:`, error);
				}
			}
		} catch (error) {
			console.warn(
				`Failed to process repositories from ${client.registry.name}:`,
				error,
			);
		}
	}

	return allRepos;
}


async function fetchRepositoryDetail(
	name: string,
	namespace?: string,
	source?: string,
	clients: ContainerRegistryClient[] = [],
): Promise<RepositoryDetail> {
	if (clients.length === 0) {
		throw new Error("No registry clients available");
	}


	let targetClient: ContainerRegistryClient;
	if (source) {
		const client = clients.find((c) => c.registry.name === source);
		if (!client) {
			throw new Error(`Registry client not found for source: ${source}`);
		}
		targetClient = client;
	} else {
		targetClient = clients[0];
	}


	const repository = await targetClient.repository(name, namespace);
	if (!repository) {
		throw new Error(
			`Repository ${namespace ? `${namespace}/${name}` : name} not found`,
		);
	}


	const oopTags = await repository.tags();
	const tags: Tag[] = [];


	for (const oopTag of oopTags) {
		try {
			const manifest = await oopTag.manifest();
			const images = await manifest.images();

			if (images.length === 0) continue;

			const architectures = images.map((image) => image.architectureInfo);


			let totalSize = 0;
			if (manifest.isMultiPlatform()) {
				totalSize = images.reduce((sum, image) => sum + image.size, 0);
			} else {
				totalSize = images[0].size;
			}


			let lastUpdated = new Date().toISOString();
			try {
				const configBlob = await images[0].config.blob();
				if (configBlob.created) {
					lastUpdated = configBlob.created;
				}
			} catch (_error) {

			}

			tags.push({
				name: oopTag.name,
				digest: manifest.digest,
				size: formatBytes(totalSize),
				lastUpdated,
				architectures,
				mediaType: manifest.mediaType,
			});
		} catch (error) {
			console.warn(`Failed to process tag ${oopTag.name}:`, error);
		}
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

	return {
		name,
		namespace,
		tagCount: oopTags.length,
		totalSize,
		totalSizeFormatted: formatBytes(totalSize),
		architectures,
		lastUpdated: latestTag?.lastUpdated || new Date().toISOString(),
		tags,
		createdAt: new Date().toISOString(),
		source: targetClient.registry.name,
	};
}


export function useRepositories() {
	const [loadingProgress, setLoadingProgress] =
		useState<LoadingProgress | null>(null);
	const { clients, initializeClients } = useRepositoryStore(
		useShallow((state) => ({
			clients: state.clients,
			initializeClients: state.initializeClients,
		})),
	);

	const selectRepositories = useMemo(
		() => (data: RepositoryMeta[]) => {

			return [...data].sort((a, b) => {
				const aName = `${a.namespace || ""}/${a.name}`;
				const bName = `${b.namespace || ""}/${b.name}`;
				return aName.localeCompare(bName);
			});
		},
		[],
	);

	const queryResult = useQuery({
		queryKey: ["repositories"],
		queryFn: async () => {

			setLoadingProgress({
				progress: 0,
				message: "Starting refresh...",
				currentStep: 0,
				totalSteps: 0,
			});

			try {

				if (clients.length === 0) {
					await initializeClients();
					const updatedState = useRepositoryStore.getState();
					const result = await fetchRepositories(
						updatedState.clients,
						setLoadingProgress,
					);
					setLoadingProgress(null);
					return result;
				}
				const result = await fetchRepositories(clients, setLoadingProgress);
				setLoadingProgress(null);
				return result;
			} catch (error) {
				setLoadingProgress(null);
				throw error;
			}
		},
		select: selectRepositories,
		refetchInterval: 30 * 1000,
	});

	return {
		...queryResult,
		loadingProgress,
	};
}


export function useRepository(
	name: string,
	namespace?: string,
	source?: string,
) {
	const { clients } = useRepositoryStore(
		useShallow((state) => ({
			clients: state.clients,
		})),
	);

	const repoKey = namespace ? `${namespace}/${name}` : name;

	const selectRepository = useMemo(
		() => (data: RepositoryDetail) => {

			return {
				...data,
				tags: [...data.tags].sort((a, b) => a.name.localeCompare(b.name)),
			};
		},
		[],
	);

	return useQuery({
		queryKey: ["repository", repoKey, source],
		queryFn: () => fetchRepositoryDetail(name, namespace, source, clients),
		enabled: !!name && clients.length > 0,
		select: selectRepository,
		refetchInterval: 30 * 1000,
	});
}


export function useRepositoryMutations() {
	const queryClient = useQueryClient();
	const { deleteRepository, deleteTag } = useRepositoryStore(
		useShallow((state) => ({
			deleteRepository: state.deleteRepository,
			deleteTag: state.deleteTag,
		})),
	);

	const deleteRepositoryMutation = useMutation({
		mutationFn: async ({
			name,
			namespace,
			source,
		}: {
			name: string;
			namespace?: string;
			source?: string;
		}) => {
			const success = await deleteRepository(name, namespace, source);
			if (!success) {
				throw new Error("Failed to delete repository");
			}
			return { success, name, namespace, source };
		},
		onSuccess: (data) => {

			const repoKey = data.namespace
				? `${data.namespace}/${data.name}`
				: data.name;
			queryClient.invalidateQueries({
				queryKey: ["repository", repoKey, data.source],
			});

			queryClient.invalidateQueries({ queryKey: ["repositories"] });
		},
	});

	const deleteTagMutation = useMutation({
		mutationFn: async ({
			repositoryName,
			tagName,
			namespace,
			source,
		}: {
			repositoryName: string;
			tagName: string;
			namespace?: string;
			source?: string;
		}) => {
			const success = await deleteTag(
				repositoryName,
				tagName,
				namespace,
				source,
			);
			if (!success) {
				throw new Error("Failed to delete tag");
			}
			return success;
		},
		onSuccess: (_, variables) => {

			const repoKey = variables.namespace
				? `${variables.namespace}/${variables.repositoryName}`
				: variables.repositoryName;
			queryClient.invalidateQueries({
				queryKey: ["repository", repoKey, variables.source],
			});

			queryClient.invalidateQueries({ queryKey: ["repositories"] });
		},
	});

	return {
		deleteRepository: deleteRepositoryMutation,
		deleteTag: deleteTagMutation,
	};
}
