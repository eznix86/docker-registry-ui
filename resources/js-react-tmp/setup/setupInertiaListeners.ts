// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import type { ExploreProps, RepositoryProps } from "~/types"
import { router } from "@inertiajs/react"
import { useExploreStore } from "~/stores/exploreStore"
import { useFilterStore } from "~/stores/filterStore"
import { usePagePropsStore } from "~/stores/pagePropsStore"
import { useRepositoryStore } from "~/stores/repositoryStore"

/**
 * Set up Inertia event listeners to sync application state
 */
export function setupInertiaListeners() {
	/**
	 * Sync function to update stores from Inertia props
	 */
	const syncStores = (props: ExploreProps | RepositoryProps) => {
		const filterState = useFilterStore.getState()
		const exploreState = useExploreStore.getState()
		const pagePropsState = usePagePropsStore.getState()
		const repositoryState = useRepositoryStore.getState()

		// Sync explore page data
		if ("repositories" in props && props.repositories !== undefined) {
			exploreState.setRepositories(props.repositories || [])
		}

		if ("totalRepositories" in props && props.totalRepositories !== undefined) {
			exploreState.setTotalRepositories(props.totalRepositories)
		}

		// Sync explore page filters
		if ("registries" in props && props.registries) {
			filterState.setRemoteRegistries(props.registries)
		}

		if ("architectures" in props && props.architectures) {
			filterState.setRemoteArchitectures(props.architectures)
		}

		if ("filters" in props && props.filters) {
			if ("registries" in props.filters && props.filters.registries) {
				filterState.setSelectedRegistries(props.filters.registries)
			}

			if ("architectures" in props.filters && props.filters.architectures) {
				filterState.setSelectedArchitectures(props.filters.architectures)
			}

			if (
				"showUntagged" in props.filters
				&& props.filters.showUntagged !== undefined
			) {
				filterState.setSelectedShowUntagged(props.filters.showUntagged)
			}

			if ("search" in props.filters && props.filters.search !== undefined) {
				filterState.setSelectedSearch(props.filters.search)
				filterState.setLocalSearch(props.filters.search)
			}
		}

		// Sync repository page data
		if ("repository" in props) {
			pagePropsState.setRepository(props.repository || null)
			repositoryState.setRemoteRepository(props.repository || null)
		}

		if ("tags" in props) {
			pagePropsState.setTags(props.tags || { data: [] })
			repositoryState.setRemoteTags(props.tags || { data: [] })
		}

		// Sync repository page filters
		if (
			"filters" in props
			&& props.filters
			&& ("sortBy" in props.filters || "filter" in props.filters)
		) {
			const filters = props.filters as {
				sortBy?: "newest" | "oldest" | "name" | "size"
				filter?: string
			}
			repositoryState.setRemoteFilters({
				sortBy: filters.sortBy || "newest",
				filter: filters.filter || "",
			})
		}
	}

	// Listen to 'success' for partial reloads (filter changes with preserveState)
	router.on("success", (event) => {
		syncStores(event.detail.page.props as ExploreProps | RepositoryProps)
	})

	// Listen to 'navigate' for full page loads and history navigation
	router.on("navigate", (event) => {
		syncStores(event.detail.page.props as ExploreProps | RepositoryProps)
	})
}
