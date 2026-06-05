<template>
	<div class="border border-outline rounded-lg bg-card p-4 sm:p-6">
		<div class="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
			<div class="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
				<h2 class="text-lg font-semibold leading-7 text-primary tabular-nums">
					{{ tag.name }}
				</h2>
				<div class="flex items-center gap-2">
					<span class="text-sm text-muted-foreground">Last updated {{ lastUpdated }}</span>
					<button
						v-if="!disableTagDeletion"
						v-ripple
						class="effect-hover-destructive effect-ripple-destructive inline-flex h-8 w-8 shrink-0 items-center justify-center rounded transition-colors hover:bg-muted"
						:aria-label="`Delete chart version ${tag.name}`"
						:title="`Delete chart version ${tag.name}`"
						@click="emit('deleteTag', tag)"
					>
						<svg
							class="h-5 w-5 text-destructive"
							fill="currentColor"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
						</svg>
					</button>
				</div>
			</div>

			<div class="grid w-full grid-cols-2 items-center gap-2 sm:flex sm:w-auto sm:shrink-0 sm:flex-wrap">
				<Button
					size="sm"
					variant="default"
					class="flex-1 sm:flex-none"
					:aria-label="`View default values for ${tag.name}`"
					@click="viewerDialog?.open(repository, tag.name, 'values')"
				>
					Default Values
				</Button>
				<Button
					size="sm"
					variant="default"
					class="flex-1 sm:flex-none"
					:aria-label="`View templates for ${tag.name}`"
					@click="viewerDialog?.open(repository, tag.name, 'files')"
				>
					View Templates
				</Button>
			</div>
		</div>

		<div class="mt-5 grid min-w-0 gap-4 lg:grid-cols-2">
			<div class="min-w-0 overflow-hidden rounded-md bg-background/40 p-2 shadow-[inset_0_0_0_1px_var(--color-outline)]">
				<div class="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
					Install chart
				</div>
				<CopyCommand
					full-width
					:command="installCommand"
					:aria-label="`Copy install command for ${tag.name}`"
				/>
			</div>
			<div class="min-w-0 overflow-hidden rounded-md bg-background/40 p-2 shadow-[inset_0_0_0_1px_var(--color-outline)]">
				<div class="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
					Pull chart
				</div>
				<CopyCommand
					full-width
					:command="pullCommand"
					:aria-label="`Copy pull command for ${tag.name}`"
				/>
			</div>
		</div>

		<HelmChartViewerDialog ref="viewerDialog" />
	</div>
</template>

<script setup lang="ts">
import type { Repository, Tag } from "~/types"
import { useTimeAgo } from "@vueuse/core"
import { computed, ref } from "vue"
import HelmChartViewerDialog from "~/components/HelmChartViewerDialog.vue"
import { Button, CopyCommand } from "~/components/ui"
import { useRepositoryName } from "~/composables/useRepositoryName"

interface RepositoryHelmTagCardProps {
	tag: Tag
	repository: Repository
	disableTagDeletion: boolean
}

const props = defineProps<RepositoryHelmTagCardProps>()
const emit = defineEmits<{ deleteTag: [tag: Tag] }>()

const repositoryName = useRepositoryName(() => props.repository)
const viewerDialog = ref<InstanceType<typeof HelmChartViewerDialog> | null>(null)

const chartVersion = computed(() => props.tag.chartVersion || props.tag.name)
const chartRef = computed(() => `oci://${props.repository.registryHost}/${repositoryName.value}`)

const installCommand = computed(
	() => `helm install <release-name> ${chartRef.value} --version ${chartVersion.value}`,
)
const pullCommand = computed(
	() => `helm pull ${chartRef.value} --version ${chartVersion.value}`,
)

const lastUpdated = computed(() => {
	if (!props.tag.createdAt || props.tag.createdAt.startsWith("0001-01-01")) {
		return "Unknown"
	}
	return useTimeAgo(new Date(props.tag.createdAt)).value
})
</script>
