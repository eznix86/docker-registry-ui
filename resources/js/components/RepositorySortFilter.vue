<template>
	<div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:justify-between mb-6">
		<div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
			<div class="flex items-center gap-3 w-full md:w-48">
				<span id="sort-by-label" class="text-muted-foreground text-sm whitespace-nowrap">Sort by</span>
				<Select :model-value="sortBy" aria-labelledby="sort-by-label" @update:model-value="emit('update:sortBy', $event)">
					<SelectTrigger aria-labelledby="sort-by-label">
						{{ sortBy }}
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="Newest" label="Newest" />
						<SelectItem value="Oldest" label="Oldest" />
						<SelectItem value="Name" label="Name" />
						<SelectItem value="Size" label="Size" />
					</SelectContent>
				</Select>
			</div>

			<div class="relative w-full sm:w-64">
				<svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
				</svg>
				<input
					id="filter-tags-input"
					:value="filterQuery"
					type="text"
					placeholder="Filter tags"
					aria-label="Filter tags"
					class="w-full pl-10 pr-3.5 py-[7.5px] border border-field rounded-lg focus:outline-none focus:ring-2 focus:ring-focus focus:border-transparent text-sm leading-[23px]"
					@input="emit('update:filterQuery', ($event.target as HTMLInputElement).value)"
				>
			</div>
		</div>

		<span class="text-muted-foreground text-sm">{{ filteredCount }} of {{ totalCount }} tags</span>
	</div>
</template>

<script setup lang="ts">
import type { RepositoryProps } from "~/types"
import { usePage } from "@inertiajs/vue3"
import { computed } from "vue"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "~/components/ui"
import { useRepositoryFilterStore } from "~/stores/useRepositoryFilterStore"

interface RepositorySortFilterProps {
	sortBy: string
	filterQuery: string
}

defineProps<RepositorySortFilterProps>()

const emit = defineEmits<{
	"update:sortBy": [value: string]
	"update:filterQuery": [value: string]
}>()

const page = usePage<RepositoryProps>()
const repositoryStore = useRepositoryFilterStore()

const tags = computed(() => page.props.tags?.data || [])
const totalCount = computed(() => tags.value.length)

const filteredCount = computed(() => {
	if (!repositoryStore.localFilter) {
		return tags.value.length
	}
	return tags.value.filter(tag =>
		tag.name.toLowerCase().includes(repositoryStore.localFilter.toLowerCase()),
	).length
})
</script>
