// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { defineStore } from "pinia"
import { computed, ref } from "vue"

export const useRepositoryFilterStore = defineStore("repositoryFilter", () => {
	// State
	const searchQuery = ref("")
	const selectedRegistries = ref<string[]>([])
	const selectedArchitecture = ref<string>("all")
	const showUntagged = ref(false)

	// Actions
	function setSearchQuery(query: string) {
		searchQuery.value = query
	}

	function clearSearch() {
		searchQuery.value = ""
	}

	function setRegistries(registries: string[]) {
		selectedRegistries.value = registries
	}

	function setArchitecture(arch: string) {
		selectedArchitecture.value = arch
	}

	function toggleUntagged() {
		showUntagged.value = !showUntagged.value
	}

	function resetFilters() {
		searchQuery.value = ""
		selectedRegistries.value = []
		selectedArchitecture.value = "all"
		showUntagged.value = false
	}

	// Getters
	const hasActiveFilters = computed(() => {
		return (
			searchQuery.value !== ""
			|| selectedRegistries.value.length > 0
			|| (selectedArchitecture.value !== "all" && selectedArchitecture.value !== "")
			|| showUntagged.value
		)
	})

	return {
		// State
		searchQuery,
		selectedRegistries,
		selectedArchitecture,
		showUntagged,
		// Actions
		setSearchQuery,
		clearSearch,
		setRegistries,
		setArchitecture,
		toggleUntagged,
		resetFilters,
		// Getters
		hasActiveFilters,
	}
})
