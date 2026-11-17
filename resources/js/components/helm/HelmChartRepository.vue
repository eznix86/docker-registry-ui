<template>
	<div v-if="selected">
		<section class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
			<div class="min-w-0 space-y-3">
				<p v-if="selected.chartDesc" class="text-base text-muted-foreground">{{ selected.chartDesc }}</p>
				<div class="flex flex-wrap items-center gap-2">
					<Chip v-if="selected.chartDeprecated" variant="warning" size="normal">Deprecated</Chip>
					<Chip v-if="selected.chartType" size="normal">{{ selected.chartType }}</Chip>
					<Chip v-if="selected.chartAppVersion" size="normal">App {{ selected.chartAppVersion }}</Chip>
				</div>
			</div>

			<div
				role="group"
				aria-label="Chart view"
				class="inline-flex shrink-0 self-start rounded-md border border-outline p-0.5"
			>
				<button
					v-for="option in viewOptions"
					:key="option.id"
					type="button"
					class="rounded px-3 py-1.5 text-sm transition-colors"
					:class="
						view === option.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
					"
					:aria-pressed="view === option.id"
					@click="option.id === 'details' ? showVersion(selected.name) : showList()"
				>
					{{ option.label }}
				</button>
			</div>
		</section>

		<HelmVersionList
			v-if="view === 'versions'"
			:versions="versions"
			:latest="latestVersion"
			:disable-tag-deletion="disableTagDeletion"
			@view="showVersion"
			@delete-tag="tag => emit('deleteTag', tag)"
		/>

		<div v-else class="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
			<HelmChartSidebar
				class="lg:order-2"
				:repository="repository"
				:versions="versions"
				:latest="latestVersion"
				:selected="selected"
				:disable-tag-deletion="disableTagDeletion"
				@select="showVersion"
				@delete-tag="tag => emit('deleteTag', tag)"
			/>
			<div class="min-w-0 lg:order-1">
				<HelmChartFiles :repository="repository" :tag-name="selected.name" :digest="selected.digest" inline />
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { router, usePage } from "@inertiajs/vue3"
import { computed } from "vue"

import HelmChartFiles from "~/components/helm/HelmChartFiles.vue"
import HelmChartSidebar from "~/components/helm/HelmChartSidebar.vue"
import HelmVersionList from "~/components/helm/HelmVersionList.vue"
import { Chip } from "~/components/ui"
import type { Repository, Tag } from "~/types"

const props = defineProps<{
	repository: Repository
	versions: Tag[]
	disableTagDeletion: boolean
}>()

const emit = defineEmits<{ deleteTag: [tag: Tag] }>()

const viewOptions = [
	{ id: "details", label: "Details" },
	{ id: "versions", label: "All versions" },
] as const

const page = usePage()
const query = computed(() => new URL(page.url, window.location.origin).searchParams)
const view = computed(() => (query.value.get("view") === "versions" ? "versions" : "details"))
const latestVersion = computed(() => props.versions[0]?.name ?? "")
const selected = computed(() => props.versions.find(v => v.name === query.value.get("version")) ?? props.versions[0])

function visit(params: Record<string, string>) {
	const search = new URLSearchParams(params).toString()
	router.push({
		url: search ? `${window.location.pathname}?${search}` : window.location.pathname,
		preserveScroll: true,
		preserveState: true,
	})
}

function showVersion(version: string) {
	visit({ version })
}

function showList() {
	visit({ view: "versions" })
}
</script>
