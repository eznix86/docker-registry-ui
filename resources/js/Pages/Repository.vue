<template>
	<div class="h-screen bg-background text-foreground flex flex-col">
		<HeaderComponent />

		<main class="flex-1 lg:p-8 p-4 sm:p-6 overflow-y-auto">
			<RepositoryBreadcrumb />

			<RepositoryHeader @open-bulk-delete="openBulkDeleteDialog" />

			<RepositoryMetadata />

			<RepositorySortFilter
				:sort-by="sortByDisplay"
				:filter-query="localFilterQuery"
				@update:sort-by="handleSortChange"
				@update:filter-query="handleFilterQueryChange"
			/>

			<InfiniteScroll data="tags" class="space-y-6">
				<RepositoryTagCard
					v-for="tag in filteredTags"
					:key="tag.name"
					:tag="tag"
					:registry-host="registryHost"
					:repository-name="repositoryName"
					@delete-tag="openDeleteTagDialog"
				/>
			</InfiniteScroll>
		</main>

		<VersionFooter
			current-version="v0.5.1"
			latest-version="v0.5.4"
			update-url="#"
		/>

		<BulkDeleteTagsDialog
			v-model="bulkDeleteDialogOpen"
			v-model:selected-tags="selectedTagsForDeletion"
			v-model:select-all="selectAllTags"
			:tags="filteredTags"
			@close="closeBulkDeleteDialog"
			@confirm-delete="confirmBulkDelete"
		/>

		<DeleteTagDialog
			v-model="deleteTagDialogOpen"
			:tag-name="selectedTag?.name"
			@close="deleteTagDialogOpen = false"
			@confirm-delete="confirmDeleteTag"
		/>
	</div>
</template>

<script setup lang="ts">
import type { RepositoryProps, Tag } from "~/types"
import { InfiniteScroll, usePage } from "@inertiajs/vue3"
import { useDebounceFn } from "@vueuse/core"
import { computed, ref, watch } from "vue"
import BulkDeleteTagsDialog from "~/components/BulkDeleteTagsDialog.vue"
import DeleteTagDialog from "~/components/DeleteTagDialog.vue"
import HeaderComponent from "~/components/HeaderComponent.vue"
import RepositoryBreadcrumb from "~/components/RepositoryBreadcrumb.vue"
import RepositoryHeader from "~/components/RepositoryHeader.vue"
import RepositoryMetadata from "~/components/RepositoryMetadata.vue"
import RepositorySortFilter from "~/components/RepositorySortFilter.vue"
import RepositoryTagCard from "~/components/RepositoryTagCard.vue"
import VersionFooter from "~/components/VersionFooter.vue"
import { useRepositoryName } from "~/composables/useRepositoryName"
import { useRepositoryFilterStore } from "~/stores/useRepositoryFilterStore"

const page = usePage<RepositoryProps>()
const repositoryStore = useRepositoryFilterStore()

const repository = computed(() => page.props.repository)
const tags = computed(() => page.props.tags?.data || [])
const repositoryName = useRepositoryName(repository)

const registryHost = computed(() => repository.value?.registry || "")
const currentUrl = computed(() => location.pathname)

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

const bulkDeleteDialogOpen = ref(false)
const deleteTagDialogOpen = ref(false)
const selectedTag = ref<Tag | null>(null)
const selectedTagsForDeletion = ref<string[]>([])
const selectAllTags = ref(false)

const localFilterQuery = ref(repositoryStore.localFilter)

watch(
	() => repositoryStore.localFilter,
	(newValue) => {
		localFilterQuery.value = newValue
	},
)

const filteredTags = computed(() => {
	if (!localFilterQuery.value) {
		return tags.value
	}
	return tags.value.filter(tag =>
		tag.name.toLowerCase().includes(localFilterQuery.value.toLowerCase()),
	)
})

const sortByDisplay = computed(() => {
	const sortBy = repositoryStore.filters.sortBy
	if (sortBy === "newest")
		return "Newest"
	if (sortBy === "oldest")
		return "Oldest"
	if (sortBy === "name")
		return "Name"
	if (sortBy === "size")
		return "Size"
	return "Newest"
})

const debouncedFilterRequest = useDebounceFn(() => {
	repositoryStore.setFilter(localFilterQuery.value, currentUrl.value)
}, 300)

function handleSortChange(value: string) {
	const sortByValue = value.toLowerCase() as
		| "newest"
		| "oldest"
		| "name"
		| "size"
	repositoryStore.setSortBy(sortByValue, currentUrl.value)
}

function handleFilterQueryChange(value: string) {
	localFilterQuery.value = value
	repositoryStore.setLocalFilter(value)
	debouncedFilterRequest()
}

watch(selectAllTags, (newValue) => {
	if (newValue) {
		selectedTagsForDeletion.value = filteredTags.value.map(
			tag => tag.name,
		)
	}
	else {
		selectedTagsForDeletion.value = []
	}
})

watch(selectedTagsForDeletion, (newValue) => {
	if (
		newValue.length === filteredTags.value.length
		&& filteredTags.value.length > 0
	) {
		selectAllTags.value = true
	}
	else {
		selectAllTags.value = false
	}
})

function openBulkDeleteDialog() {
	selectedTagsForDeletion.value = []
	selectAllTags.value = false
	bulkDeleteDialogOpen.value = true
}

function closeBulkDeleteDialog() {
	bulkDeleteDialogOpen.value = false
	selectedTagsForDeletion.value = []
	selectAllTags.value = false
}

function confirmBulkDelete() {
	closeBulkDeleteDialog()
}

function openDeleteTagDialog(tag: Tag) {
	selectedTag.value = tag
	deleteTagDialogOpen.value = true
}

function confirmDeleteTag() {
	if (!selectedTag.value)
		return

	deleteTagDialogOpen.value = false
	selectedTag.value = null
}
</script>
