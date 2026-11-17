<template>
	<aside class="space-y-5">
		<div>
			<span
				id="helm-version-label"
				class="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
			>
				Version
			</span>
			<Select :model-value="selected.name" aria-labelledby="helm-version-label" @update:model-value="selectVersion">
				<SelectTrigger>
					<span class="tabular-nums">{{ selected.name }}</span>
					<span v-if="selected.name === latest" class="ml-2 text-xs text-muted-foreground">latest</span>
				</SelectTrigger>
				<SelectContent>
					<SelectItem v-for="version in versions" :key="version.name" :value="version.name" :label="version.name" />
				</SelectContent>
			</Select>
		</div>

		<div v-for="command in commands" :key="command.label">
			<div class="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{{ command.label }}</div>
			<CopyCommand full-width :command="command.value" :aria-label="`Copy ${command.label.toLowerCase()} command`" />
		</div>

		<dl class="divide-y divide-outline rounded-lg border border-outline text-sm">
			<div v-for="row in details" :key="row.label" class="flex items-start justify-between gap-4 px-3 py-2">
				<dt class="text-muted-foreground">{{ row.label }}</dt>
				<dd class="break-all text-right text-foreground">{{ row.value }}</dd>
			</div>
		</dl>

		<div v-if="dependencies.length > 0">
			<div class="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dependencies</div>
			<ul class="divide-y divide-outline rounded-lg border border-outline text-sm">
				<li v-for="dep in dependencies" :key="dep.name" class="px-3 py-2">
					<div class="flex justify-between gap-2">
						<span class="font-medium text-foreground">{{ dep.name }}</span>
						<span class="tabular-nums text-muted-foreground">{{ dep.version }}</span>
					</div>
					<div v-if="dep.repository" class="truncate text-xs text-muted-foreground" :title="dep.repository">
						{{ dep.repository }}
					</div>
				</li>
			</ul>
		</div>

		<Button
			v-if="!disableTagDeletion"
			variant="destructive"
			size="sm"
			class="w-full"
			@click="emit('deleteTag', selected)"
		>
			Delete version {{ selected.name }}
		</Button>
	</aside>
</template>

<script setup lang="ts">
import { computed } from "vue"

import { Button, CopyCommand, Select, SelectContent, SelectItem, SelectTrigger } from "~/components/ui"
import { useHelmCommands } from "~/composables/useHelmCommands"
import { pushedAgo, shortenDigest } from "~/lib/utils"
import type { Repository, Tag } from "~/types"

const props = defineProps<{
	repository: Repository
	versions: Tag[]
	latest: string
	selected: Tag
	disableTagDeletion: boolean
}>()

const emit = defineEmits<{ select: [version: string]; deleteTag: [tag: Tag] }>()

function selectVersion(version: string | number | undefined) {
	if (typeof version === "string") emit("select", version)
}

const { install, pull, showValues } = useHelmCommands(
	() => props.repository,
	() => props.selected.chartVersion || props.selected.name,
)

const commands = computed(() => [
	{ label: "Install", value: install.value },
	{ label: "Pull", value: pull.value },
	{ label: "Save default values", value: showValues.value },
])

const dependencies = computed(() => props.selected.chartDependencies ?? [])

const details = computed(() =>
	[
		{ label: "App version", value: props.selected.chartAppVersion },
		{ label: "Kubernetes", value: props.selected.chartKubeVersion },
		{ label: "API version", value: props.selected.chartApiVersion },
		{ label: "Pushed", value: pushedAgo(props.selected.createdAt) },
		{ label: "Digest", value: shortenDigest(props.selected.digest) },
	].filter(row => row.value),
)
</script>
