// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import type { Repository, RepositoryFilters, TagScroll } from "~/types"
import { router } from "@inertiajs/vue3"
import { defineStore } from "pinia"
import { ref } from "vue"

export const useRepositoryStore = defineStore("repository", () => {
	// State
	const repository = ref<Repository | null>(null)
	const tags = ref<TagScroll>({ data: [] })
	const filters = ref<RepositoryFilters>({
		sortBy: "newest",
		filter: "",
	})

	// Local state for immediate UI updates
	const localFilter = ref("")

	/**
	 * Build query params from current filter state
	 */
	function buildFilterParams(): Record<string, string> {
		const params: Record<string, string> = {}

		if (filters.value.sortBy !== "newest") {
			params.sortBy = filters.value.sortBy
		}

		if (filters.value.filter) {
			params.filter = filters.value.filter
		}

		return params
	}

	/**
	 * Perform Inertia router.get with current filters
	 */
	function performFilterRequest(url: string) {
		const params = buildFilterParams()

		router.get(url, params, {
			preserveScroll: true,
			preserveState: true,
			replace: true,
			only: ["tags", "filters"],
		})
	}

	// Actions
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
