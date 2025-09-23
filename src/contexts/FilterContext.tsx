import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useMemo,
} from "react";
import { useSearchParams } from "react-router-dom";
import type { RepositoryMeta } from "../hooks/useRepositoryData";
import type { SourceInfo } from "../lib/container-registry";

interface FilterContextValue {
	searchQuery: string | null;
	architectureFilter: string;
	showUntagged: boolean;
	selectedSources: string[];
	filteredRepos: RepositoryMeta[];
	availableArchitectures: string[];
	availableSources: Array<{ key: string; host: string }>;
	getSourceHost: (sourceName?: string) => string;
}

const FilterContext = createContext<FilterContextValue | null>(null);

interface FilterProviderProps {
	children: ReactNode;
	repositoryMetas: RepositoryMeta[];
	sources: Record<string, SourceInfo>;
}

export function FilterProvider({
	children,
	repositoryMetas,
	sources,
}: FilterProviderProps) {
	const [searchParams] = useSearchParams();

	const searchQuery = searchParams.get("search");
	const architectureFilter = searchParams.get("arch") || "all";
	const showUntagged = searchParams.get("showUntagged") === "true";
	const sourcesQuery = searchParams.get("sources") || "";
	const selectedSources = sourcesQuery ? sourcesQuery.split(",") : [];

	const availableArchitectures = useMemo(() => {
		return [
			...new Set(repositoryMetas.flatMap((repo) => repo.architectures || [])),
		];
	}, [repositoryMetas]);

	const availableSources = useMemo(() => {
		return Object.entries(sources).map(([key, source]) => ({
			key,
			host: source.host,
		}));
	}, [sources]);

	const getSourceHost = useCallback(
		(sourceName?: string) => {
			if (!sourceName || !sources[sourceName]) {
				return "Unknown";
			}
			return sources[sourceName].host;
		},
		[sources],
	);

	const filteredRepos = useMemo(() => {
		let filtered = repositoryMetas;

		if (searchQuery) {
			const lowerSearchQuery = searchQuery.toLowerCase();
			filtered = filtered.filter(
				(repo: RepositoryMeta) =>
					repo.name.toLowerCase().includes(lowerSearchQuery) ||
					repo.namespace?.toLowerCase().includes(lowerSearchQuery),
			);
		}

		if (architectureFilter !== "all") {
			filtered = filtered.filter((repo) =>
				repo.architectures?.includes(architectureFilter),
			);
		}

		if (selectedSources.length > 0) {
			filtered = filtered.filter((repo) => {
				const sourceHost = getSourceHost(repo.source);
				return selectedSources.includes(sourceHost);
			});
		}

		if (!showUntagged) {
			filtered = filtered.filter((repo) => {
				return repo.tagCount > 0;
			});
		}

		return filtered;
	}, [
		repositoryMetas,
		searchQuery,
		architectureFilter,
		selectedSources,
		showUntagged,
		getSourceHost,
	]);

	const value = useMemo(
		() => ({
			searchQuery,
			architectureFilter,
			showUntagged,
			selectedSources,
			filteredRepos,
			availableArchitectures,
			availableSources,
			getSourceHost,
		}),
		[
			searchQuery,
			architectureFilter,
			showUntagged,
			selectedSources,
			filteredRepos,
			availableArchitectures,
			availableSources,
			getSourceHost,
		],
	);

	return (
		<FilterContext.Provider value={value}>{children}</FilterContext.Provider>
	);
}

export function useFilter() {
	const context = useContext(FilterContext);
	if (!context) {
		throw new Error("useFilter must be used within a FilterProvider");
	}
	return context;
}
