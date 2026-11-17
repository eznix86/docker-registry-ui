<template>
	<div class="overflow-hidden rounded-lg border border-outline">
		<div class="border-b border-outline bg-muted/40 px-3 py-2">
			<input
				v-model="filter"
				type="search"
				placeholder="Filter versions"
				aria-label="Filter versions"
				class="w-full bg-transparent text-sm text-foreground outline-hidden placeholder:text-muted-foreground"
			/>
		</div>
		<table class="w-full text-sm">
			<thead class="text-left text-xs uppercase tracking-wider text-muted-foreground">
				<tr class="border-b border-outline">
					<th class="px-3 py-2 font-semibold">Version</th>
					<th class="hidden px-3 py-2 font-semibold sm:table-cell">App version</th>
					<th class="hidden px-3 py-2 font-semibold sm:table-cell">Pushed</th>
					<th class="px-3 py-2"><span class="sr-only">Actions</span></th>
				</tr>
			</thead>
			<tbody class="divide-y divide-outline">
				<tr v-for="version in shown" :key="version.name" class="hover:bg-muted/40">
					<td class="px-3 py-1.5">
						<span class="font-medium tabular-nums text-foreground">{{ version.name }}</span>
						<Chip v-if="version.name === latest" class="ml-2" variant="primary">latest</Chip>
						<Chip v-if="version.chartDeprecated" class="ml-2" variant="warning">deprecated</Chip>
					</td>
					<td class="hidden px-3 py-1.5 tabular-nums text-muted-foreground sm:table-cell">
						{{ version.chartAppVersion }}
					</td>
					<td class="hidden px-3 py-1.5 text-muted-foreground sm:table-cell">{{ pushedAgo(version.createdAt) }}</td>
					<td class="px-3 py-1.5">
						<div class="flex items-center justify-end gap-1">
							<Button
								size="sm"
								variant="ghost"
								:aria-label="`View version ${version.name}`"
								@click="emit('view', version.name)"
							>
								View
							</Button>
							<button
								v-if="!disableTagDeletion"
								v-ripple
								class="effect-hover-destructive effect-ripple-destructive inline-flex h-8 w-8 items-center justify-center rounded transition-colors hover:bg-muted"
								:aria-label="`Delete version ${version.name}`"
								:title="`Delete version ${version.name}`"
								@click="emit('deleteTag', version)"
							>
								<svg class="h-4 w-4 text-destructive" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
									<path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
								</svg>
							</button>
						</div>
					</td>
				</tr>
				<tr v-if="shown.length === 0">
					<td colspan="4" class="px-3 py-4 text-center text-muted-foreground">No version matches “{{ filter }}”.</td>
				</tr>
			</tbody>
		</table>
	</div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"

import { Button, Chip } from "~/components/ui"
import { pushedAgo } from "~/lib/utils"
import type { Tag } from "~/types"

const props = defineProps<{
	versions: Tag[]
	latest: string
	disableTagDeletion: boolean
}>()

const emit = defineEmits<{ view: [version: string]; deleteTag: [tag: Tag] }>()

const filter = ref("")
const shown = computed(() => props.versions.filter(v => v.name.includes(filter.value.trim())))
</script>
