<!--
SPDX-License-Identifier: AGPL-3.0-or-later
Copyright (C) 2025  Bruno Bernard

This file is part of Docker Registry UI (Container Hub).

Docker Registry UI is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

Docker Registry UI is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
-->

<template>
	<div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:justify-between mb-6">
		<div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
			<div class="flex items-center gap-3 w-full md:w-52">
				<span id="sort-by-label" class="text-muted-foreground text-sm whitespace-nowrap">Sort by</span>
				<Select :model-value="repositoryStore.filters.sortBy" aria-labelledby="sort-by-label" @update:model-value="handleSortChange">
					<SelectTrigger aria-labelledby="sort-by-label">
						{{ sortByDisplay }}
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="newest" label="Newest" />
						<SelectItem value="oldest" label="Oldest" />
						<SelectItem value="name-asc" label="Name (A-Z)" />
						<SelectItem value="name-desc" label="Name (Z-A)" />
						<SelectItem value="size-asc" label="Size (Smallest)" />
						<SelectItem value="size-desc" label="Size (Largest)" />
					</SelectContent>
				</Select>
			</div>

			<div class="relative w-full sm:w-64">
				<svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
				</svg>
				<input
					id="filter-tags-input"
					:value="repositoryStore.localFilter"
					type="text"
					placeholder="Filter tags"
					aria-label="Filter tags"
					class="w-full pl-10 pr-3.5 py-[7.5px] border border-field rounded-lg focus:outline-none focus:ring-2 focus:ring-focus focus:border-transparent text-sm leading-[23px]"
					@input="handleFilterQueryChange(($event.target as HTMLInputElement).value)"
				>
			</div>
		</div>

		<span class="text-muted-foreground text-sm">{{ filteredCount }} of {{ totalTagsCount }} tags</span>
	</div>
</template>

<script setup lang="ts">
import type { RepositoryProps } from "~/types"
import { usePage } from "@inertiajs/vue3"
import { useDebounceFn } from "@vueuse/core"
import { computed } from "vue"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "~/components/ui"
import { useRepositoryFilterStore } from "~/stores/useRepositoryFilterStore"

const page = usePage<RepositoryProps>()
const repositoryStore = useRepositoryFilterStore()

// Total tags from database (repository.tagsCount)
const totalTagsCount = computed(() => page.props.repository?.tagsCount ?? 0)

// Filtered count based on local search filter
const filteredCount = computed(() => repositoryStore.filteredTags.length)

const sortByDisplay = computed(() => {
	const sortBy = repositoryStore.filters.sortBy
	if (sortBy === "newest")
		return "Newest"
	if (sortBy === "oldest")
		return "Oldest"
	if (sortBy === "name-asc")
		return "Name (A-Z)"
	if (sortBy === "name-desc")
		return "Name (Z-A)"
	if (sortBy === "size-asc")
		return "Size (Smallest)"
	if (sortBy === "size-desc")
		return "Size (Largest)"
	return "Newest"
})

const debouncedFilterRequest = useDebounceFn(() => {
	repositoryStore.setFilter(repositoryStore.localFilter)
}, 300)

function handleSortChange(value: string | number | undefined) {
	if (!value || typeof value !== "string")
		return
	const sortByValue = value as
		| "newest"
		| "oldest"
		| "name-asc"
		| "name-desc"
		| "size-asc"
		| "size-desc"
	repositoryStore.setSortBy(sortByValue)
}

function handleFilterQueryChange(value: string) {
	repositoryStore.setLocalFilter(value)
	debouncedFilterRequest()
}
</script>
