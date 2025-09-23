import { del as idbDel, get as idbGet, set as idbSet } from "idb-keyval";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
	ContainerRegistryClient,
	type SourceInfo,
} from "../lib/container-registry";

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

interface SimpleRepositoryStore {
	clients: ContainerRegistryClient[];
	sources: Record<string, SourceInfo>;
	hydrated: boolean;

	initializeClients: () => Promise<void>;
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
	setHydrated: (hydrated: boolean) => void;
}

async function fetchSources(): Promise<Record<string, SourceInfo>> {
	try {
		const response = await fetch("/sources.json");
		if (response.ok) {
			return await response.json();
		}
	} catch (error) {
		console.warn("Failed to fetch sources:", error);
	}
	return {};
}

export const useRepositoryStore = create<SimpleRepositoryStore>()(
	persist(
		(set, get) => ({
			clients: [],
			sources: {},
			hydrated: false,

			initializeClients: async () => {
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
					console.error("Failed to initialize clients:", error);
					set({ sources: {}, clients: [] });
				}
			},

			deleteRepository: async (
				name: string,
				namespace?: string,
				source?: string,
			) => {
				const state = get();

				try {
					let targetClient: ContainerRegistryClient;

					if (source) {
						const client = state.clients.find(
							(c) => c.registry.name === source || c.registry.registryType === source,
						);
						if (!client) {
							throw new Error(
								`Registry client not found for source: ${source}`,
							);
						}
						targetClient = client;
					} else {
						if (state.clients.length === 0) {
							throw new Error("No registry clients available");
						}
						targetClient = state.clients[0];
					}

					const repository = await targetClient.repository(name, namespace);
					if (!repository) {
						throw new Error(
							`Repository ${namespace ? `${namespace}/${name}` : name} not found`,
						);
					}

					const tags = await repository.tags();
					let allDeleted = true;

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
				const state = get();

				try {
					let targetClient: ContainerRegistryClient;

					if (source) {
						const client = state.clients.find(
							(c) => c.registry.name === source || c.registry.registryType === source,
						);
						if (!client) {
							throw new Error(
								`Registry client not found for source: ${source}`,
							);
						}
						targetClient = client;
					} else {
						if (state.clients.length === 0) {
							throw new Error("No registry clients available");
						}
						targetClient = state.clients[0];
					}

					const repository = await targetClient.repository(
						repositoryName,
						namespace,
					);
					if (!repository) {
						throw new Error(
							`Repository ${namespace ? `${namespace}/${repositoryName}` : repositoryName} not found`,
						);
					}

					const tag = await repository.tag(tagName);
					if (!tag) {
						return true;
					}

					const success = await tag.delete();
					return success;
				} catch (error) {
					console.error("Failed to delete tag:", error);
					return false;
				}
			},

			setHydrated: (hydrated: boolean) => set({ hydrated }),
		}),
		{
			name: "simple-repository-store",
			storage,
			partialize: (state) => ({
				sources: state.sources,
			}),
			onRehydrateStorage: () => (state) => {
				state?.setHydrated(true);
			},
		},
	),
);

export { useShallow } from "zustand/react/shallow";
