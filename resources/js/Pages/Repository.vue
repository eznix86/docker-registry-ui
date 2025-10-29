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
	<div class="h-screen bg-background text-foreground flex flex-col">
		<HeaderComponent />

		<main class="flex-1 lg:p-8 p-4 sm:p-6 overflow-y-auto">
			<RepositoryBreadcrumb />

			<RepositoryHeader />

			<RepositoryMetadata />

			<RepositorySortFilter />

			<InfiniteScroll data="tags" class="space-y-6">
				<RepositoryTagCard
					v-for="tag in repositoryStore.filteredTags"
					:key="tag.name"
					:tag="tag"
				/>
			</InfiniteScroll>
		</main>

		<VersionFooter
			current-version="v0.5.1"
			latest-version="v0.5.4"
			update-url="#"
		/>

		<BulkDeleteTagsDialog :tags="repositoryStore.filteredTags" />

		<DeleteTagDialog />
	</div>
</template>

<script setup lang="ts">
import type { RepositoryProps } from "~/types"
import { InfiniteScroll, usePage } from "@inertiajs/vue3"
import { watch } from "vue"
import BulkDeleteTagsDialog from "~/components/BulkDeleteTagsDialog.vue"
import DeleteTagDialog from "~/components/DeleteTagDialog.vue"
import HeaderComponent from "~/components/HeaderComponent.vue"
import RepositoryBreadcrumb from "~/components/RepositoryBreadcrumb.vue"
import RepositoryHeader from "~/components/RepositoryHeader.vue"
import RepositoryMetadata from "~/components/RepositoryMetadata.vue"
import RepositorySortFilter from "~/components/RepositorySortFilter.vue"
import RepositoryTagCard from "~/components/RepositoryTagCard.vue"
import VersionFooter from "~/components/VersionFooter.vue"
import { useRepositoryFilterStore } from "~/stores/useRepositoryFilterStore"
import { useTagBulkDeleteStore } from "~/stores/useTagBulkDeleteStore"

const page = usePage<RepositoryProps>()
const repositoryStore = useRepositoryFilterStore()
const bulkDeleteStore = useTagBulkDeleteStore()

// Sync filters from props
watch(
	() => page.props.filters,
	(filters) => {
		if (filters) {
			repositoryStore.setFilters(filters)
			repositoryStore.setLocalFilter(filters.filter)
		}
	},
	{ immediate: true },
)

// Sync select all with filtered tags
watch(() => bulkDeleteStore.selectAll, (newValue) => {
	if (newValue) {
		bulkDeleteStore.selectedTags = repositoryStore.filteredTags.map(tag => tag.name)
	}
	else {
		bulkDeleteStore.selectedTags = []
	}
})

watch(() => bulkDeleteStore.selectedTags, (newValue) => {
	if (
		newValue.length === repositoryStore.filteredTags.length
		&& repositoryStore.filteredTags.length > 0
	) {
		bulkDeleteStore.selectAll = true
	}
	else {
		bulkDeleteStore.selectAll = false
	}
})
</script>
