// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import type { Repository, RepositoryFilters, TagScroll } from "~/types"
import { router } from "@inertiajs/vue3"
import { defineStore } from "pinia"
import { ref } from "vue"

// ========== HELPER FUNCTIONS (outside store) ==========

/**
 * Build query params from current filter state
 */
function buildFilterParams(filters: RepositoryFilters): Record<string, string> {
	const params: Record<string, string> = {}

	if (filters.sortBy !== "newest") {
		params.sortBy = filters.sortBy
	}

	if (filters.filter) {
		params.filter = filters.filter
	}

	return params
}

// ========== STORE ==========

export const useRepositoryFilterStore = defineStore("repositoryFilter", () => {
	// ========== STATE ==========

	const repository = ref<Repository | null>(null)
	const tags = ref<TagScroll>({ data: [] })
	const filters = ref<RepositoryFilters>({
		sortBy: "newest",
		filter: "",
	})

	// Local state for immediate UI updates
	const localFilter = ref("")

	// ========== ACTIONS ==========

	function setRepository(repo: Repository | null) {
		repository.value = repo
	}

	function setTags(tagScroll: TagScroll) {
		tags.value = tagScroll
	}

	function setFilters(newFilters: RepositoryFilters) {
		filters.value = newFilters
	}

	function setSortBy(
		sortBy: RepositoryFilters["sortBy"],
		url: string,
	) {
		filters.value.sortBy = sortBy
		if (url) {
			performFilterRequest(url)
		}
	}

	function setFilter(filter: string, url: string) {
		filters.value.filter = filter
		localFilter.value = filter
		if (url) {
			performFilterRequest(url)
		}
	}

	function setLocalFilter(filter: string) {
		localFilter.value = filter
	}

	/**
	 * Perform Inertia router.get with current filters
	 */
	function performFilterRequest(url: string) {
		const params = buildFilterParams(filters.value)

		router.get(url, params, {
			preserveScroll: true,
			preserveState: true,
			replace: true,
			only: ["tags", "filters"],
		})
	}

	return {
		// State
		repository,
		tags,
		filters,
		localFilter,

		// Actions
		setRepository,
		setTags,
		setFilters,
		setSortBy,
		setFilter,
		setLocalFilter,
	}
})
