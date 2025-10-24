// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { defineStore } from "pinia"
import { ref } from "vue"

export const useTagFilterStore = defineStore("tagFilter", () => {
	// State
	const sortBy = ref("Newest")
	const filterQuery = ref("")

	// Actions
	function setSortBy(sort: string) {
		sortBy.value = sort
	}

	function setFilterQuery(query: string) {
		filterQuery.value = query
	}

	function resetTagFilters() {
		sortBy.value = "Newest"
		filterQuery.value = ""
	}

	return {
		// State
		sortBy,
		filterQuery,
		// Actions
		setSortBy,
		setFilterQuery,
		resetTagFilters,
	}
})
