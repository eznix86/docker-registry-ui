<template>
	<AppLayout>
		<div class="h-screen bg-background text-foreground flex flex-col">
			<HeaderComponent />

			<main class="flex-1 lg:p-8 p-4 sm:p-6 overflow-y-auto">
				<RepositoryBreadcrumb :repository="repository" />

				<RepositoryHeader :repository="repository" :disable-tag-deletion="page.props.disableTagDeletion" @bulk-delete="openBulkDelete" />

				<RepositoryMetadata :repository="repository" />

				<RepositorySortFilter
					:sort-by="currentSortBy"
					:filter="currentFilter"
					:total-count="repository.tagsCount"
					@update:sort-by="setSortBy"
					@update:filter="setFilter"
				/>

				<InfiniteScroll data="tags" class="space-y-6">
					<RepositoryTagCard
						v-for="tag in tags"
						:key="tag.name"
						:tag="tag"
						:repository="repository"
						:disable-tag-deletion="page.props.disableTagDeletion"
						@delete-tag="openDeleteTag"
					/>
				</InfiniteScroll>
			</main>

			<BulkDeleteTagsDialog
				ref="bulkDeleteRef"
				:tags="bulkDeleteTags"
				:total-tags-count="repository.tagsCount"
			/>

			<DeleteTagDialog
				v-if="tagToDelete"
				:tag="tagToDelete"
				@close="tagToDelete = null"
			/>
		</div>
	</AppLayout>
</template>

<script setup lang="ts">
import type { RepositoryFilters, RepositoryProps, Tag } from "~/types"
import { InfiniteScroll, router, usePage } from "@inertiajs/vue3"
import { computed, ref } from "vue"
import BulkDeleteTagsDialog from "~/components/BulkDeleteTagsDialog.vue"
import DeleteTagDialog from "~/components/DeleteTagDialog.vue"
import HeaderComponent from "~/components/HeaderComponent.vue"
import RepositoryBreadcrumb from "~/components/RepositoryBreadcrumb.vue"
import RepositoryHeader from "~/components/RepositoryHeader.vue"
import RepositoryMetadata from "~/components/RepositoryMetadata.vue"
import RepositorySortFilter from "~/components/RepositorySortFilter.vue"
import RepositoryTagCard from "~/components/RepositoryTagCard.vue"
import { useAutoRefreshOnSync } from "~/composables/useAutoRefreshOnSync"
import AppLayout from "~/layouts/AppLayout.vue"
import { buildFilterParams } from "~/lib/filterParams"
import { normalizeArray } from "~/lib/normalize"
import { currentPath } from "~/lib/routes"

const page = usePage<RepositoryProps>()
const repository = computed(() => page.props.repository)
const tags = computed(() => normalizeArray(page.props.tags?.data) as Tag[])
const bulkDeleteTags = computed(() => (page.props as any).bulkDeleteTags ?? [])

const tagToDelete = ref<Tag | null>(null)
const bulkDeleteRef = ref<InstanceType<typeof BulkDeleteTagsDialog> | null>(null)

function openDeleteTag(tag: Tag) {
	tagToDelete.value = tag
}

function openBulkDelete() {
	bulkDeleteRef.value?.open()
}

const currentSortBy = ref(page.props.filters?.sortBy || "newest")
const currentFilter = ref(page.props.filters?.filter || "")

function navigate(params: Record<string, string>) {
	const p = Object.fromEntries(buildFilterParams(params).entries())
	router.get(currentPath(), p, {
		preserveScroll: true,
		preserveState: true,
		replace: true,
		reset: ["tags"],
		only: ["tags", "filters"],
	})
}

function setSortBy(v: string) {
	const val = v as RepositoryFilters["sortBy"]
	currentSortBy.value = val
	navigate({ sortBy: val, filter: currentFilter.value })
}

function setFilter(v: string) {
	currentFilter.value = v
	navigate({ sortBy: currentSortBy.value, filter: v })
}

useAutoRefreshOnSync()
</script>
