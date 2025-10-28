// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025  Bruno Bernard
//
// This file is part of Docker Registry UI (Container Hub).
//
// Docker Registry UI is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
//
// Docker Registry UI is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.

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
