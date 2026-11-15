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
						<svg class="h-5 w-5 text-destructive" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
							<path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
						</svg>
					</button>
				</div>
			</div>

			<div class="flex w-full items-center sm:w-auto sm:shrink-0">
				<Button
					size="sm"
					variant="default"
					class="flex-1 sm:flex-none"
					:aria-label="`View chart files for ${tag.name}`"
					@click="viewerDialog?.open(repository, tag.name, tag.digest)"
				>
					View Chart
				</Button>
			</div>
		</div>

		<p v-if="tag.chartDesc" class="mt-3 text-sm text-muted-foreground">
			{{ tag.chartDesc }}
		</p>

		<div v-if="hasMetadata" class="mt-3 flex flex-wrap items-center gap-2">
			<Chip v-if="tag.chartDeprecated" variant="warning" size="normal">Deprecated</Chip>
			<Chip v-if="tag.chartAppVersion" size="normal">App {{ tag.chartAppVersion }}</Chip>
			<Chip v-if="tag.chartKubeVersion" size="normal">Kubernetes {{ tag.chartKubeVersion }}</Chip>
			<Chip v-for="dep in dependencies" :key="dep.name" size="normal" :title="dep.repository || undefined">
				{{ dep.name }} {{ dep.version }}
			</Chip>
		</div>

		<div class="mt-5 grid min-w-0 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
			<div
				class="min-w-0 overflow-hidden rounded-md bg-background/40 p-2 shadow-[inset_0_0_0_1px_var(--color-outline)]"
			>
				<div class="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Install chart</div>
				<CopyCommand full-width :command="installCommand" :aria-label="`Copy install command for ${tag.name}`" />
			</div>
			<div
				class="min-w-0 overflow-hidden rounded-md bg-background/40 p-2 shadow-[inset_0_0_0_1px_var(--color-outline)]"
			>
				<div class="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pull chart</div>
				<CopyCommand full-width :command="pullCommand" :aria-label="`Copy pull command for ${tag.name}`" />
			</div>
			<div
				class="min-w-0 overflow-hidden rounded-md bg-background/40 p-2 shadow-[inset_0_0_0_1px_var(--color-outline)]"
			>
				<div class="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
					Save default values
				</div>
				<CopyCommand
					full-width
					:command="showValuesCommand"
					:aria-label="`Copy command to save default values of ${tag.name}`"
				/>
			</div>
		</div>

		<HelmChartViewerDialog ref="viewerDialog" />
	</div>
</template>

<script setup lang="ts">
import { useTimeAgo } from "@vueuse/core"
import { computed, ref } from "vue"

import HelmChartViewerDialog from "~/components/HelmChartViewerDialog.vue"
import { Button, Chip, CopyCommand } from "~/components/ui"
import { useRepositoryName } from "~/composables/useRepositoryName"
import type { Repository, Tag } from "~/types"

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
const registryHost = computed(() => props.repository.registryPublicHost ?? props.repository.registryHost)
const chartRef = computed(() => `oci://${registryHost.value}/${repositoryName.value}`)

const installCommand = computed(() => `helm install <release-name> ${chartRef.value} --version ${chartVersion.value}`)
const pullCommand = computed(() => `helm pull ${chartRef.value} --version ${chartVersion.value}`)
const showValuesCommand = computed(
	() => `helm show values ${chartRef.value} --version ${chartVersion.value} > values.yaml`,
)

const dependencies = computed(() => props.tag.chartDependencies ?? [])
const hasMetadata = computed(
	() =>
		props.tag.chartDeprecated ||
		!!props.tag.chartAppVersion ||
		!!props.tag.chartKubeVersion ||
		dependencies.value.length > 0,
)

const lastUpdated = computed(() => {
	if (!props.tag.createdAt || props.tag.createdAt.startsWith("0001-01-01")) {
		return "Unknown"
	}
	return useTimeAgo(new Date(props.tag.createdAt)).value
})
</script>
