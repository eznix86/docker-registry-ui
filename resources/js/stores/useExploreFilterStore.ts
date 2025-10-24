// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { router } from "@inertiajs/vue3"
import { useDebounceFn } from "@vueuse/core"
import { defineStore } from "pinia"
import { computed, ref } from "vue"

function buildFilterParams(
	registries: string[],
	architectures: string[],
	showUntagged: boolean,
	search: string,
): Record<string, string> {
	const params: Record<string, string> = {}

	if (registries.length > 0) {
		params.registries = registries.join(",")
	}

	if (architectures.length > 0) {
		params.architectures = architectures.join(",")
	}

	if (showUntagged) {
		params.untagged = "true"
	}

	if (search) {
		params.search = search
	}

	return params
}

export const useExploreFilterStore = defineStore("exploreFilter", () => {
	const selectedRegistries = ref<string[]>([])
	const selectedArchitectures = ref<string[]>([])
	const selectedShowUntagged = ref(false)
	const selectedSearch = ref("")
	const localSearch = ref("")

	const hasActiveFilters = computed(() => {
		return (
			selectedRegistries.value.length > 0
			|| selectedArchitectures.value.length > 0
			|| selectedShowUntagged.value
			|| selectedSearch.value !== ""
		)
	})

	function performFilterRequest() {
		const params = buildFilterParams(
			selectedRegistries.value,
			selectedArchitectures.value,
			selectedShowUntagged.value,
			selectedSearch.value,
		)

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

	return {
		selectedRegistries,
		selectedArchitectures,
		selectedShowUntagged,
		selectedSearch,
		localSearch,
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
	}
})
