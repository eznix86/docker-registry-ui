// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { router } from "@inertiajs/vue3"
import { defineStore } from "pinia"
import { computed, ref } from "vue"

/**
 * Debounce helper function
 */
function debounce<T extends (...args: any[]) => void>(
	fn: T,
	delay: number,
): (...args: Parameters<T>) => void {
	let timeoutId: ReturnType<typeof setTimeout> | null = null
	return (...args: Parameters<T>) => {
		if (timeoutId !== null) {
			clearTimeout(timeoutId)
		}
		timeoutId = setTimeout(() => fn(...args), delay)
	}
}

export const useFilterStore = defineStore("filter", () => {
	// Selected filters (user selection)
	const selectedRegistries = ref<string[]>([])
	const selectedArchitectures = ref<string[]>([])
	const selectedShowUntagged = ref(false)
	const selectedSearch = ref("")

	// Local state for immediate UI updates
	const localSearch = ref("")

	/**
	 * Build query params from current filter state
	 */
	function buildFilterParams(): Record<string, string> {
		const params: Record<string, string> = {}

		if (selectedRegistries.value.length > 0) {
			params.registries = selectedRegistries.value.join(",")
		}

		if (selectedArchitectures.value.length > 0) {
			params.architectures = selectedArchitectures.value.join(",")
		}

		if (selectedShowUntagged.value) {
			params.untagged = "true"
		}

		if (selectedSearch.value) {
			params.search = selectedSearch.value
		}

		return params
	}

	/**
	 * Perform Inertia router.get with current filters
	 */
	function performFilterRequest() {
		const params = buildFilterParams()

		router.get("/", params, {
			preserveScroll: true,
			preserveState: true,
			replace: true,
			only: ["repositories", "totalRepositories", "filters"],
		})
	}

	/**
	 * Debounced version of performFilterRequest for search
	 */
	const debouncedFilterRequest = debounce(performFilterRequest, 300)

	// Actions
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

	function setSelectedRegistries(registries: string[]) {
		selectedRegistries.value = registries
	}

	function setSelectedArchitectures(architectures: string[]) {
		selectedArchitectures.value = architectures
	}

	function setSelectedShowUntagged(showUntagged: boolean) {
		selectedShowUntagged.value = showUntagged
	}

	function setSelectedSearch(search: string) {
		selectedSearch.value = search
	}

	function setLocalSearch(search: string) {
		localSearch.value = search
	}

	// Computed
	const hasActiveFilters = computed(() => {
		return (
			selectedRegistries.value.length > 0
			|| selectedArchitectures.value.length > 0
			|| selectedShowUntagged.value
			|| selectedSearch.value !== ""
		)
	})

	return {
		// State
		selectedRegistries,
		selectedArchitectures,
		selectedShowUntagged,
		selectedSearch,
		localSearch,
		// Actions
		toggleRegistry,
		setArchitecture,
		toggleShowUntagged,
		setSearch,
		setSelectedRegistries,
		setSelectedArchitectures,
		setSelectedShowUntagged,
		setSelectedSearch,
		setLocalSearch,
		// Computed
		hasActiveFilters,
	}
})
