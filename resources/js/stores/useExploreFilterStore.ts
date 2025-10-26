// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { router } from "@inertiajs/vue3"
import { useDebounceFn } from "@vueuse/core"
import { defineStore } from "pinia"
import { computed, ref } from "vue"
import { buildFilterParams } from "~/lib/filterParams"

export const useExploreFilterStore = defineStore("exploreFilter", () => {
	const selectedRegistries = ref<string[]>([])
	const selectedArchitectures = ref<string[]>([])
	const selectedShowUntagged = ref(false)
	const selectedSearch = ref("")
	const localSearch = ref("")
	const sidebarOpen = ref(false)

	const hasActiveFilters = computed(() => {
		return (
			selectedRegistries.value.length > 0
			|| selectedArchitectures.value.length > 0
			|| selectedShowUntagged.value
			|| selectedSearch.value !== ""
		)
	})

	function performFilterRequest() {
		const params = buildFilterParams({
			registries: selectedRegistries.value,
			architectures: selectedArchitectures.value,
			untagged: selectedShowUntagged.value,
			search: selectedSearch.value,
		})

		router.get("/", params, {
			preserveScroll: true,
			preserveState: true,
			replace: true,
			only: ["repositories", "totalRepositories", "filters"],
		})
	}

	const debouncedFilterRequest = useDebounceFn(performFilterRequest, 300)

	function toggleRegistry(registry: string) {
		if (selectedRegistries.value.includes(registry)) {
			selectedRegistries.value = selectedRegistries.value.filter(
				r => r !== registry,
			)
		}
		else {
			selectedRegistries.value = [...selectedRegistries.value, registry]
		}
		performFilterRequest()
	}

	function setArchitecture(architecture: string | null) {
		selectedArchitectures.value = architecture ? [architecture] : []
		performFilterRequest()
	}

	function toggleShowUntagged() {
		selectedShowUntagged.value = !selectedShowUntagged.value
		performFilterRequest()
	}

	function setSearch(search: string) {
		selectedSearch.value = search
		localSearch.value = search
		debouncedFilterRequest()
	}

	function setRegistries(registries: string[]) {
		selectedRegistries.value = registries
	}

	function setArchitectures(architectures: string[]) {
		selectedArchitectures.value = architectures
	}

	function setShowUntagged(showUntagged: boolean) {
		selectedShowUntagged.value = showUntagged
	}

	function setSelectedSearch(search: string) {
		selectedSearch.value = search
	}

	function setLocalSearch(search: string) {
		localSearch.value = search
	}

	function setSidebarOpen(open: boolean) {
		sidebarOpen.value = open
	}

	return {
		selectedRegistries,
		selectedArchitectures,
		selectedShowUntagged,
		selectedSearch,
		localSearch,
		sidebarOpen,
		hasActiveFilters,
		toggleRegistry,
		setArchitecture,
		toggleShowUntagged,
		setSearch,
		setRegistries,
		setArchitectures,
		setShowUntagged,
		setSelectedSearch,
		setLocalSearch,
		setSidebarOpen,
	}
})
