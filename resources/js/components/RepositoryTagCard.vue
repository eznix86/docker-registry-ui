<template>
	<div class="border border-outline rounded-lg bg-card p-4 sm:p-6 has-[.tag-aliases]:pb-4">
		<div
			class="flex flex-col gap-3 pb-4 has-[+.tag-aliases]:pb-1 sm:flex-row sm:items-center sm:justify-between"
		>
			<div class="flex items-center justify-between gap-3 sm:justify-start sm:gap-4">
				<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
					<h2 class="text-lg font-semibold leading-7 text-primary">
						{{ tag.name }}
					</h2>
					<span class="text-sm text-muted-foreground">Last updated {{ lastUpdated }}</span>
				</div>
				<button
					v-if="!disableTagDeletion"
					v-ripple
					class="effect-hover-destructive effect-ripple-destructive shrink-0 rounded p-2 transition-colors hover:bg-muted sm:order-last"
					:aria-label="`Delete tag ${tag.name}`"
					:title="`Delete tag ${tag.name}`"
					@click="emit('deleteTag', tag)"
				>
					<svg
						class="h-5 w-5 text-destructive"
						fill="currentColor"
						viewBox="0 0 24 24"
						aria-hidden="true"
					>
						<path
							d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
						/>
					</svg>
				</button>
			</div>
			<CopyCommand
				:command="pullCommand"
				:aria-label="`Copy command for ${tag.name}`"
			/>
		</div>

		<div
			v-if="tag.alias && tag.alias.length > 0"
			class="tag-aliases flex flex-wrap items-center gap-1.5 pb-4"
		>
			<Chip
				v-for="alias in tag.alias"
				:key="alias"
				variant="primary"
				size="small"
				class="border-outline/90 text-info/90"
			>
				{{ alias }}
			</Chip>
		</div>

		<div class="overflow-x-auto rounded-lg border border-outline">
			<table class="min-w-[500px] w-full border-collapse bg-background">
				<thead class="text-left text-sm text-muted-foreground">
					<tr>
						<th class="border-b border-outline px-4 py-1.5 font-semibold">
							Digest
						</th>
						<th class="border-b border-outline px-4 py-1.5 font-semibold">
							OS/ARCH
						</th>
						<th class="border-b border-outline px-4 py-1.5 font-semibold">
							Size
						</th>
					</tr>
				</thead>
				<tbody>
					<tr
						v-if="!hasImageMetadata"
						class="transition-colors hover:bg-muted"
					>
						<td class="border-b border-outline px-4 py-3 text-sm text-primary">
							{{ shortDigest }}
						</td>
						<td class="border-b border-outline px-4 py-3 text-sm text-muted-foreground">
							Manifest metadata unavailable
						</td>
						<td class="border-b border-outline px-4 py-3 text-sm text-muted-foreground">
							Unknown
						</td>
					</tr>
					<tr
						v-for="(image, idx) in tag.images"
						:key="idx"
						class="transition-colors hover:bg-muted"
					>
						<td class="border-b border-outline px-4 py-1.5 text-sm text-primary">
							{{ image.digest.substring(0, 19) }}
						</td>
						<td class="border-b border-outline px-4 py-1.5 text-sm text-muted-foreground">
							{{ image.os }}/{{ image.architecture }}{{ image.variant ? `/${image.variant}` : "" }}
						</td>
						<td class="border-b border-outline px-4 py-1.5 text-sm text-muted-foreground">
							<span v-if="image.stub" class="inline-flex items-center gap-1">
								<span class="text-xs text-muted-foreground/50">~</span>{{ formatBytes(image.size) }}
								<span class="text-[10px] text-muted-foreground/40">(index)</span>
							</span>
							<span v-else>{{ formatBytes(image.size) }}</span>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { Repository, Tag } from "~/types"
import { useTimeAgo } from "@vueuse/core"
import { computed } from "vue"
import Chip from "~/components/ui/Chip.vue"
import CopyCommand from "~/components/ui/CopyCommand.vue"
import { usePreferences } from "~/composables/usePreferences"
import { useRepositoryName } from "~/composables/useRepositoryName"
import { formatBytes } from "~/lib/utils"

interface RepositoryTagCardProps {
	tag: Tag
	repository: Repository
	disableTagDeletion: boolean
}

const props = defineProps<RepositoryTagCardProps>()
const emit = defineEmits<{ deleteTag: [tag: Tag] }>()

const { getPullCommand } = usePreferences()

const registryHost = computed(() => props.repository.registryPublicHost ?? props.repository.registryHost)
const repositoryName = useRepositoryName(() => props.repository)
const pullCommand = computed(() => getPullCommand(registryHost.value, repositoryName.value, props.tag.name))
const hasImageMetadata = computed(() => props.tag.metadataAvailable && props.tag.images.length > 0)
const shortDigest = computed(() => props.tag.digest.substring(0, 19))

const lastUpdated = computed(() => {
	if (!props.tag.createdAt || props.tag.createdAt.startsWith("0001-01-01")) {
		return "Unknown"
	}
	return useTimeAgo(new Date(props.tag.createdAt)).value
})
</script>
