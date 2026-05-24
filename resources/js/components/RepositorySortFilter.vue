<template>
	<div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:justify-between mb-6">
		<div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
			<div class="flex items-center gap-3 w-full md:w-52">
				<span id="sort-by-label" class="text-muted-foreground text-sm whitespace-nowrap">Sort by</span>
				<Select :model-value="sortBy" aria-labelledby="sort-by-label" @update:model-value="(v: any) => emit('update:sortBy', v)">
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
					:value="filter"
					type="text"
					placeholder="Filter tags"
					aria-label="Filter tags"
					class="w-full pl-10 pr-3.5 py-[7.5px] border border-field rounded-lg focus:outline-none focus:ring-2 focus:ring-focus focus:border-transparent text-sm leading-[23px]"
					@input="emit('update:filter', ($event.target as HTMLInputElement).value)"
				>
			</div>
		</div>

		<span class="text-muted-foreground text-sm">{{ tags.length }} of {{ totalCount }} tags</span>
	</div>
</template>

<script setup lang="ts">
import type { Tag } from "~/types"
import { usePage } from "@inertiajs/vue3"
import { computed } from "vue"
import { Select, SelectContent, SelectItem, SelectTrigger } from "~/components/ui"
import { normalizeArray } from "~/lib/normalize"

const props = defineProps<{
	sortBy: string
	filter: string
	totalCount: number
}>()

const emit = defineEmits<{
	"update:sortBy": [value: string]
	"update:filter": [value: string]
}>()

const page = usePage<{ props: { tags?: any } }>()
const tags = computed(() => normalizeArray((page.props.tags as any)?.data) as Tag[])

const sortByDisplay = computed(() => {
	const m: Record<string, string> = { "newest": "Newest", "oldest": "Oldest", "name-asc": "Name (A-Z)", "name-desc": "Name (Z-A)", "size-asc": "Size (Smallest)", "size-desc": "Size (Largest)" }
	return m[props.sortBy] || "Newest"
})
</script>
