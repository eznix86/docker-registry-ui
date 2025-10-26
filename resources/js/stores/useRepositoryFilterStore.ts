// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import type { Repository, RepositoryFilters, TagScroll } from "~/types"
import { router } from "@inertiajs/vue3"
import { defineStore } from "pinia"
import { ref } from "vue"
import { buildFilterParams } from "~/lib/filterParams"

export const useRepositoryFilterStore = defineStore("repositoryFilter", () => {
	const repository = ref<Repository | null>(null)
	const tags = ref<TagScroll>({ data: [] })
	const filters = ref<RepositoryFilters>({
		sortBy: "newest",
		filter: "",
	})
	const localFilter = ref("")

	function setRepository(repo: Repository | null) {
		repository.value = repo
	}

	function setTags(tagScroll: TagScroll) {
		tags.value = tagScroll
	}

	function setFilters(newFilters: RepositoryFilters) {
		filters.value = newFilters
	}

	function setSortBy(sortBy: RepositoryFilters["sortBy"], url: string) {
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

	function performFilterRequest(url: string) {
		const params = buildFilterParams({
			sortBy: filters.value.sortBy,
			filter: filters.value.filter,
		})

		router.get(url, params, {
			preserveScroll: true,
			preserveState: true,
			replace: true,
			reset: ["tags"],
			only: ["tags", "filters"],
		})
	}

	return {
		repository,
		tags,
		filters,
		localFilter,
		setRepository,
		setTags,
		setFilters,
		setSortBy,
		setFilter,
		setLocalFilter,
	}
})
