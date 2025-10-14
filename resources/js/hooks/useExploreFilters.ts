// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { router, usePage } from "@inertiajs/react";
import type { ExploreFilters, ExploreProps } from "~/types";

export function useExploreFilters() {
	const { filters } = usePage().props as ExploreProps;

	const currentFilters: ExploreFilters = {
		registries: filters?.registries || [],
		architectures: filters?.architectures || [],
		showUntagged: filters?.showUntagged || false,
		search: filters?.search || "",
	};

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

		router.get("/", params, {
			preserveScroll: true,
			preserveState: true,
			replace: true,
			only: ["repositories", "totalRepositories", "filters"],
		});
	};

	const setSearch = (search: string) => {
		applyFilters({ ...currentFilters, search });
	};

	const toggleRegistry = (registry: string) => {
		const registries = currentFilters.registries.includes(registry)
			? currentFilters.registries.filter((r) => r !== registry)
			: [...currentFilters.registries, registry];

		applyFilters({ ...currentFilters, registries });
	};

	const toggleArchitecture = (architecture: string) => {
		const architectures = currentFilters.architectures.includes(architecture)
			? currentFilters.architectures.filter((a) => a !== architecture)
			: [...currentFilters.architectures, architecture];

		applyFilters({ ...currentFilters, architectures });
	};

	const setArchitecture = (architecture: string | null) => {
		const architectures = architecture ? [architecture] : [];
		applyFilters({ ...currentFilters, architectures });
	};

	const toggleShowUntagged = () => {
		applyFilters({
			...currentFilters,
			showUntagged: !currentFilters.showUntagged,
		});
	};

	return {
		filters: currentFilters,
		toggleRegistry,
		toggleArchitecture,
		setArchitecture,
		toggleShowUntagged,
		setSearch,
	};
}
