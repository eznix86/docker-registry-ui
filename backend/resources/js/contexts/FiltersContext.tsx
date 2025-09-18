import { router, usePage } from "@inertiajs/react";
import React, {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";
import { useRegistry } from "./RegistryContext";

interface FiltersContextType {
	// Filter state
	searchQuery: string;
	architectureFilter: string;
	showUntagged: boolean;
	selectedSources: string[];

	// Computed values
	filteredRepositories: any[];

	// Actions
	updateSearch: (query: string) => void;
	updateArchitecture: (arch: string) => void;
	updateShowUntagged: (show: boolean) => void;
	updateSelectedSources: (sources: string[]) => void;
	handleSourceChange: (sourceHost: string, checked: boolean) => void;
}

const FiltersContext = createContext<FiltersContextType | undefined>(undefined);

interface FiltersProviderProps {
	children: ReactNode;
}

export function FiltersProvider({ children }: FiltersProviderProps) {
	const { url } = usePage();
	const { repositories, sources } = useRegistry();

	// Initialize filters from URL parameters
	const searchParams = new URLSearchParams(url.split("?")[1] || "");
	const [searchQuery, setSearchQuery] = useState(
		searchParams.get("search") || "",
	);
	const [architectureFilter, setArchitectureFilter] = useState(
		searchParams.get("arch") || "all",
	);
	const [showUntagged, setShowUntagged] = useState(
		searchParams.get("showUntagged") === "true",
	);
	const [selectedSources, setSelectedSources] = useState<string[]>(() => {
		const sourcesParam = searchParams.get("sources");
		return sourcesParam ? sourcesParam.split(",") : [];
	});

	// Helper function to update URL using Inertia with minimal reload
	const updateURL = useCallback(
		(newParams: Record<string, string | null>) => {
			const currentParams = new URLSearchParams(url.split("?")[1] || "");

			Object.entries(newParams).forEach(([key, value]) => {
				if (value === null || value === "") {
					currentParams.delete(key);
				} else {
					currentParams.set(key, value);
				}
			});

			const searchParams = Object.fromEntries(currentParams.entries());
			router.visit("/", {
				data: searchParams,
				preserveState: true,
				preserveScroll: true,
				only: ["repositories"],
			});
		},
		[url],
	);

	// Helper function to get source host
	const getSourceHost = useCallback(
		(sourceName?: string) => {
			if (!sourceName || !sources[sourceName]) {
				return "Unknown";
			}
			return sources[sourceName].host;
		},
		[sources],
	);

	// Compute filtered repositories
	const filteredRepositories = useMemo(() => {
		let filtered = repositories;

		// Note: Search filtering is now handled by the backend FTS
		// The repositories already come filtered from the backend based on search query

		// Architecture filter
		if (architectureFilter !== "all") {
			filtered = filtered.filter((repo) =>
				repo.architectures?.includes(architectureFilter),
			);
		}

		// Sources filter
		if (selectedSources.length > 0) {
			filtered = filtered.filter((repo) => {
				const sourceHost = getSourceHost(repo.source);
				return selectedSources.includes(sourceHost);
			});
		}

		// Show untagged filter
		if (!showUntagged) {
			filtered = filtered.filter((repo) => repo.tagCount > 0);
		}

		return filtered;
	}, [
		repositories,
		architectureFilter,
		selectedSources,
		showUntagged,
		getSourceHost,
	]);

	// Actions
	const updateSearch = useCallback(
		(query: string) => {
			setSearchQuery(query);
			updateURL({ search: query || null });
		},
		[updateURL],
	);

	const updateArchitecture = useCallback(
		(arch: string) => {
			setArchitectureFilter(arch);
			updateURL({ arch: arch === "all" ? null : arch });
		},
		[updateURL],
	);

	const updateShowUntagged = useCallback(
		(show: boolean) => {
			setShowUntagged(show);
			updateURL({ showUntagged: show ? "true" : null });
		},
		[updateURL],
	);

	const updateSelectedSources = useCallback(
		(sources: string[]) => {
			setSelectedSources(sources);
			updateURL({ sources: sources.length === 0 ? null : sources.join(",") });
		},
		[updateURL],
	);

	const handleSourceChange = useCallback(
		(sourceHost: string, checked: boolean) => {
			const newSelectedSources = checked
				? [...selectedSources, sourceHost]
				: selectedSources.filter((s) => s !== sourceHost);
			updateSelectedSources(newSelectedSources);
		},
		[selectedSources, updateSelectedSources],
	);

	const contextValue: FiltersContextType = {
		searchQuery,
		architectureFilter,
		showUntagged,
		selectedSources,
		filteredRepositories,
		updateSearch,
		updateArchitecture,
		updateShowUntagged,
		updateSelectedSources,
		handleSourceChange,
	};

	return (
		<FiltersContext.Provider value={contextValue}>
			{children}
		</FiltersContext.Provider>
	);
}

export function useFilters() {
	const context = useContext(FiltersContext);
	if (context === undefined) {
		throw new Error("useFilters must be used within a FiltersProvider");
	}
	return context;
}
