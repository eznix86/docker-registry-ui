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

import type { RepositoryFilters, RepositoryProps, Tag } from "~/types"
import { router, usePage } from "@inertiajs/vue3"
import { defineStore } from "pinia"
import { computed, ref } from "vue"
import { buildFilterParams } from "~/lib/filterParams"

export const useRepositoryFilterStore = defineStore("repositoryFilter", () => {
	const filters = ref<RepositoryFilters>({
		sortBy: "newest",
		filter: "",
	})
	const localFilter = ref("")

	// Get tags from Inertia props
	const page = usePage<RepositoryProps>()
	const tags = computed(() => (page.props.tags?.data || []) as Tag[])

	// Computed filtered tags based on local filter
	const filteredTags = computed(() => {
		if (!localFilter.value) {
			return tags.value
		}
		return tags.value.filter(tag =>
			tag.name.toLowerCase().includes(localFilter.value.toLowerCase()),
		)
	})

	function setFilters(newFilters: RepositoryFilters) {
		filters.value = newFilters
	}

	function setSortBy(sortBy: RepositoryFilters["sortBy"]) {
		filters.value.sortBy = sortBy
		performFilterRequest()
	}

	function setFilter(filter: string) {
		filters.value.filter = filter
		localFilter.value = filter
		performFilterRequest()
	}

	function setLocalFilter(filter: string) {
		localFilter.value = filter
	}

	function performFilterRequest() {
		const params = buildFilterParams({
			sortBy: filters.value.sortBy,
			filter: filters.value.filter,
		})

		router.get(location.pathname, params, {
			preserveScroll: true,
			preserveState: true,
			replace: true,
			reset: ["tags"],
			only: ["tags", "filters"],
		})
	}

	return {
		filters,
		localFilter,
		tags,
		filteredTags,
		setFilters,
		setSortBy,
		setFilter,
		setLocalFilter,
	}
})
