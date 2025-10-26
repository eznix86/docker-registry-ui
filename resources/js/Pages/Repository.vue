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
					v-for="tag in filteredTags"
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

		<BulkDeleteTagsDialog :tags="filteredTags" />

		<DeleteTagDialog />
	</div>
</template>

<script setup lang="ts">
import type { RepositoryProps } from "~/types"
import { InfiniteScroll, usePage } from "@inertiajs/vue3"
import { computed, watch } from "vue"
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

const tags = computed(() => page.props.tags?.data || [])

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

const filteredTags = computed(() => {
	if (!repositoryStore.localFilter) {
		return tags.value
	}
	return tags.value.filter(tag =>
		tag.name.toLowerCase().includes(repositoryStore.localFilter.toLowerCase()),
	)
})

// Sync select all with filtered tags
watch(() => bulkDeleteStore.selectAll, (newValue) => {
	if (newValue) {
		bulkDeleteStore.selectedTags = filteredTags.value.map(tag => tag.name)
	}
	else {
		bulkDeleteStore.selectedTags = []
	}
})

watch(() => bulkDeleteStore.selectedTags, (newValue) => {
	if (
		newValue.length === filteredTags.value.length
		&& filteredTags.value.length > 0
	) {
		bulkDeleteStore.selectAll = true
	}
	else {
		bulkDeleteStore.selectAll = false
	}
})
</script>
