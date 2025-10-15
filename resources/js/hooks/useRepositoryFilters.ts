// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { router } from "@inertiajs/react";
import { useInertiaProps } from "~/contexts/InertiaPagePropsContext";
import type { RepositoryFilters, RepositoryProps } from "~/types";

export function useRepositoryFilters() {
	const props = useInertiaProps();
	const { filters, repository } = (props || {}) as RepositoryProps;

	const currentFilters: RepositoryFilters = {
		sortBy: filters?.sortBy || "newest",
		filter: filters?.filter || "",
	};

	const applyFilters = (newFilters: RepositoryFilters) => {
		const params: Record<string, string> = {};

		if (newFilters.sortBy !== "newest") {
			params.sortBy = newFilters.sortBy;
		}

		if (newFilters.filter) {
			params.filter = newFilters.filter;
		}

		const currentPath = window.location.pathname;

		router.get(currentPath, params, {
			preserveScroll: true,
			preserveState: true,
			replace: true,
			only: ["tags", "filters"],
			reset: ["tags"],
		});
	};

	const setSortBy = (sortBy: RepositoryFilters["sortBy"]) => {
		applyFilters({ ...currentFilters, sortBy });
	};

	const setFilter = (filter: string) => {
		applyFilters({ ...currentFilters, filter });
	};

	return {
		filters: currentFilters,
		repository,
		setSortBy,
		setFilter,
	};
}
