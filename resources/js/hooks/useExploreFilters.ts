// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { router } from "@inertiajs/react";
import { useEffect, useState } from "react";
import { useInertiaProps } from "~/contexts/InertiaPagePropsContext";
import type { ExploreFilters, ExploreProps } from "~/types";
import { useDebounce } from "~/utils";

export function useExploreFilters() {
	const props = useInertiaProps();
	const { filters } = (props || {}) as ExploreProps;

	const [localSearch, setLocalSearch] = useState(filters?.search || "");
	const [localRegistries, setLocalRegistries] = useState<string[]>(
		filters?.registries || [],
	);
	const [localArchitectures, setLocalArchitectures] = useState<string[]>(
		filters?.architectures || [],
	);
	const [localShowUntagged, setLocalShowUntagged] = useState(
		filters?.showUntagged || false,
	);

	useEffect(() => {
		setLocalSearch(filters?.search || "");
	}, [filters?.search]);

	useEffect(() => {
		setLocalRegistries(filters?.registries || []);
	}, [filters?.registries]);

	useEffect(() => {
		setLocalArchitectures(filters?.architectures || []);
	}, [filters?.architectures]);

	useEffect(() => {
		setLocalShowUntagged(filters?.showUntagged || false);
	}, [filters?.showUntagged]);

	const currentFilters: ExploreFilters = {
		registries: filters?.registries || [],
		architectures: filters?.architectures || [],
		showUntagged: filters?.showUntagged || false,
		search: filters?.search || "",
	};

	const performGet = (params: Record<string, string>) => {
		router.get("/", params, {
			preserveScroll: true,
			preserveState: true,
			replace: true,
			only: ["repositories", "totalRepositories", "filters"],
		});
	};

	const debouncedGet = useDebounce(performGet, 400);

	const applyFilters = (newFilters: ExploreFilters) => {
		const params: Record<string, string> = {};

		if (newFilters.registries.length > 0) {
			params.registries = newFilters.registries.join(",");
		}

		if (newFilters.architectures.length > 0) {
			params.architectures = newFilters.architectures.join(",");
		}

		if (newFilters.showUntagged) {
			params.untagged = "true";
		}

		if (newFilters.search) {
			params.search = newFilters.search;
		}

		debouncedGet(params);
	};

	const setSearch = (search: string) => {
		setLocalSearch(search);
		applyFilters({ ...currentFilters, search });
	};

	const toggleRegistry = (registry: string) => {
		const registries = localRegistries.includes(registry)
			? localRegistries.filter((r) => r !== registry)
			: [...localRegistries, registry];

		setLocalRegistries(registries);
		applyFilters({ ...currentFilters, registries });
	};

	const toggleArchitecture = (architecture: string) => {
		const architectures = localArchitectures.includes(architecture)
			? localArchitectures.filter((a) => a !== architecture)
			: [...localArchitectures, architecture];

		setLocalArchitectures(architectures);
		applyFilters({ ...currentFilters, architectures });
	};

	const setArchitecture = (architecture: string | null) => {
		const architectures = architecture ? [architecture] : [];
		setLocalArchitectures(architectures);
		applyFilters({ ...currentFilters, architectures });
	};

	const toggleShowUntagged = () => {
		const newValue = !localShowUntagged;
		setLocalShowUntagged(newValue);
		applyFilters({
			...currentFilters,
			showUntagged: newValue,
		});
	};

	return {
		filters: currentFilters,
		localSearch,
		localRegistries,
		localArchitectures,
		localShowUntagged,
		toggleRegistry,
		toggleArchitecture,
		setArchitecture,
		toggleShowUntagged,
		setSearch,
	};
}
