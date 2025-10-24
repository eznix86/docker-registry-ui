// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import type { Registry } from "~/types"
import { router } from "@inertiajs/react"
import { dequal } from "dequal"
import { create } from "zustand"
import { debounce } from "~/utils"

interface FilterState {
	// Remote state (from server via Inertia)
	remoteRegistries: Registry[]
	remoteArchitectures: string[]

	// Local state (UI state, immediately updated)
	localRegistries: Registry[]
	localArchitectures: string[]
	localSearch: string

	// Selected filters (user selection)
	selectedRegistries: string[]
	selectedArchitectures: string[]
	selectedShowUntagged: boolean
	selectedSearch: string

	// Actions
	setRemoteRegistries: (registries: Registry[]) => void
	setRemoteArchitectures: (architectures: string[]) => void
	setLocalRegistries: (registries: Registry[]) => void
	setLocalArchitectures: (architectures: string[]) => void
	setLocalSearch: (search: string) => void
	setSelectedRegistries: (registries: string[]) => void
	setSelectedArchitectures: (architectures: string[]) => void
	setSelectedShowUntagged: (showUntagged: boolean) => void
	setSelectedSearch: (search: string) => void
	toggleRegistry: (registry: string) => void
	setArchitecture: (architecture: string | null) => void
	toggleShowUntagged: () => void
	setSearch: (search: string) => void
}

/**
 * Build query params from current filter state
 */
function buildFilterParams(state: FilterState): Record<string, string> {
	const params: Record<string, string> = {}

	if (state.selectedRegistries.length > 0) {
		params.registries = state.selectedRegistries.join(",")
	}

	if (state.selectedArchitectures.length > 0) {
		params.architectures = state.selectedArchitectures.join(",")
	}

	if (state.selectedShowUntagged) {
		params.untagged = "true"
	}

	if (state.selectedSearch) {
		params.search = state.selectedSearch
	}

	return params
}

/**
 * Perform Inertia router.get with current filters
 */
function performFilterRequest(state: FilterState) {
	const params = buildFilterParams(state)

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
const debouncedFilterRequest = debounce(performFilterRequest)

export const useFilterStore = create<FilterState>((set, get) => ({
	remoteRegistries: [],
	remoteArchitectures: [],
	localRegistries: [],
	localArchitectures: [],
	localSearch: "",
	selectedRegistries: [],
	selectedArchitectures: [],
	selectedShowUntagged: false,
	selectedSearch: "",

	setRemoteRegistries: registries =>
		set((state) => {
			if (dequal(state.remoteRegistries, registries)) {
				return state
			}
			return {
				remoteRegistries: registries,
				localRegistries: registries,
			}
		}),

	setRemoteArchitectures: architectures =>
		set((state) => {
			if (dequal(state.remoteArchitectures, architectures)) {
				return state
			}
			return {
				remoteArchitectures: architectures,
				localArchitectures: architectures,
			}
		}),

	setLocalRegistries: registries =>
		set((state) => {
			if (dequal(state.localRegistries, registries)) {
				return state
			}
			return { localRegistries: registries }
		}),

	setLocalArchitectures: architectures =>
		set((state) => {
			if (dequal(state.localArchitectures, architectures)) {
				return state
			}
			return { localArchitectures: architectures }
		}),

	setLocalSearch: search =>
		set((state) => {
			if (state.localSearch === search) {
				return state
			}
			return { localSearch: search }
		}),

	setSelectedRegistries: registries =>
		set((state) => {
			if (dequal(state.selectedRegistries, registries)) {
				return state
			}
			return { selectedRegistries: registries }
		}),

	setSelectedArchitectures: architectures =>
		set((state) => {
			if (dequal(state.selectedArchitectures, architectures)) {
				return state
			}
			return { selectedArchitectures: architectures }
		}),

	setSelectedShowUntagged: showUntagged =>
		set((state) => {
			if (state.selectedShowUntagged === showUntagged) {
				return state
			}
			return { selectedShowUntagged: showUntagged }
		}),

	setSelectedSearch: search =>
		set((state) => {
			if (state.selectedSearch === search) {
				return state
			}
			return { selectedSearch: search }
		}),

	toggleRegistry: (registry) => {
		const currentSelected = get().selectedRegistries
		const newSelected = currentSelected.includes(registry)
			? currentSelected.filter(r => r !== registry)
			: [...currentSelected, registry]

		set({ selectedRegistries: newSelected })
		performFilterRequest(get())
	},

	setArchitecture: (architecture) => {
		const architectures = architecture ? [architecture] : []
		set({ selectedArchitectures: architectures })
		performFilterRequest(get())
	},

	toggleShowUntagged: () => {
		set(state => ({ selectedShowUntagged: !state.selectedShowUntagged }))
		performFilterRequest(get())
	},

	setSearch: (search) => {
		set({ selectedSearch: search, localSearch: search })
		debouncedFilterRequest(get())
	},
}))
