<template>
	<Dialog :model-value="isOpen" wide @update:model-value="close">
		<DialogTitle>{{ repoName }}</DialogTitle>
		<p class="mb-4 text-sm text-muted-foreground">Chart version {{ tagName }}</p>

		<div
			v-if="listing === null && error"
			class="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
		>
			{{ error }}
		</div>

		<div v-else-if="listing === null" class="flex h-[60vh] items-center justify-center text-sm text-muted-foreground">
			<span
				class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
				aria-hidden="true"
			/>
			Loading chart…
		</div>

		<template v-else>
			<div role="tablist" aria-label="Chart files" class="mb-3 flex gap-1 overflow-x-auto border-b border-outline">
				<button
					v-for="tab in tabs"
					:id="`helm-tab-${tab.id}`"
					:key="tab.id"
					type="button"
					role="tab"
					:aria-selected="activeTab === tab.id"
					:aria-controls="`helm-panel-${tab.id}`"
					class="-mb-px shrink-0 border-b-2 px-3 py-2 text-sm transition-colors"
					:class="
						activeTab === tab.id
							? 'border-primary font-medium text-primary'
							: 'border-transparent text-muted-foreground hover:text-foreground'
					"
					@click="selectTab(tab.id)"
				>
					{{ tab.label }}
				</button>
			</div>

			<div
				v-if="tabs.length === 0"
				class="rounded-lg border border-outline bg-muted/30 p-4 text-sm text-muted-foreground"
			>
				This chart has no files to show.
			</div>

			<div
				v-else
				:id="`helm-panel-${activeTab}`"
				role="tabpanel"
				:aria-labelledby="`helm-tab-${activeTab}`"
				class="grid grid-cols-1 gap-3"
				:class="activeTab === 'templates' ? 'sm:grid-cols-[14rem_1fr]' : ''"
			>
				<nav
					v-if="activeTab === 'templates'"
					aria-label="Templates"
					class="max-h-40 overflow-auto rounded-lg border border-outline bg-background sm:h-[60vh] sm:max-h-none"
				>
					<ul class="divide-y divide-outline">
						<li v-for="file in templates" :key="file.path">
							<button
								type="button"
								class="flex w-full items-center justify-between gap-2 px-3 py-2 text-left font-mono text-xs transition-colors"
								:class="selectedPath === file.path ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'"
								:aria-current="selectedPath === file.path ? 'true' : undefined"
								@click="selectFile(file.path)"
							>
								<span class="truncate">{{ file.path.replace(/^templates\//, "") }}</span>
								<span class="shrink-0 text-muted-foreground">{{ formatBytes(file.size) }}</span>
							</button>
						</li>
					</ul>
				</nav>

				<div class="flex h-[60vh] min-w-0 flex-col overflow-hidden rounded-lg border border-outline">
					<div class="flex items-center justify-between gap-2 border-b border-outline bg-muted/40 px-3 py-1.5">
						<span class="truncate font-mono text-xs text-muted-foreground">{{ displayed?.path ?? selectedPath }}</span>
						<span v-if="showLoader" class="text-xs text-muted-foreground">Loading…</span>
						<CopyButton v-else-if="displayed" :value="displayed.content" :aria-label="`Copy ${displayed.path}`" />
					</div>
					<div v-if="error" class="border-b border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
						{{ error }}
					</div>
					<div
						class="min-h-0 flex-1 overflow-auto bg-background transition-opacity"
						:class="showLoader ? 'opacity-50' : ''"
					>
						<pre
							v-if="displayed && displayed.path === readmePath"
							class="whitespace-pre-wrap break-words p-4 font-mono text-xs text-foreground"
							>{{ displayed.content }}</pre>
						<CodeBlock v-else-if="displayed" :code="displayed.content" />
					</div>
				</div>
			</div>
		</template>

		<div class="mt-6 flex justify-end">
			<Button @click="close"> CLOSE </Button>
		</div>
	</Dialog>
</template>

<script setup lang="ts">
import { refDebounced } from "@vueuse/core"
import { computed, ref } from "vue"

import { Button, CodeBlock, Dialog, DialogTitle } from "~/components/ui"
import CopyButton from "~/components/ui/CopyButton.vue"
import type { HelmFileInfo } from "~/composables/useHelmChart"
import { useHelmChart } from "~/composables/useHelmChart"
import { formatBytes } from "~/lib/utils"
import type { Repository } from "~/types"

type TabId = "readme" | "values" | "chart" | "templates"

const readmePath = "README.md"
const singleFileTabs: { id: Exclude<TabId, "templates">; label: string; path: string }[] = [
	{ id: "readme", label: "README", path: readmePath },
	{ id: "values", label: "Values", path: "values.yaml" },
	{ id: "chart", label: "Chart.yaml", path: "Chart.yaml" },
]
const slowAfterMs = 200

const listingCache = new Map<string, HelmFileInfo[]>()
const fileCache = new Map<string, string>()

const isOpen = ref(false)
const repo = ref<Repository | null>(null)
const tagName = ref("")
const digest = ref("")

const helm = useHelmChart({
	registryHost: () => repo.value?.registryHost ?? "",
	repository: () => repo.value ?? { name: "", namespace: "", registry: "", registryHost: "", tagsCount: 0 },
	tagName,
})
const { loading, error } = helm
const slowLoading = refDebounced(loading, slowAfterMs)
const showLoader = computed(() => loading.value && slowLoading.value)

const listing = ref<HelmFileInfo[] | null>(null)
const activeTab = ref<TabId>("readme")
const selectedPath = ref("")
const displayed = ref<{ path: string; content: string } | null>(null)

const repoName = computed(() => repo.value?.name ?? "")
const templates = computed(() => (listing.value ?? []).filter(f => f.path.startsWith("templates/")))

const tabs = computed(() => {
	const present = new Set((listing.value ?? []).map(f => f.path))
	const out: { id: TabId; label: string }[] = singleFileTabs.filter(t => present.has(t.path))
	if (templates.value.length > 0) {
		out.push({ id: "templates", label: `Templates (${templates.value.length})` })
	}
	return out
})

async function selectFile(path: string) {
	selectedPath.value = path
	const key = `${digest.value}:${path}`
	const cached = fileCache.get(key)
	if (cached !== undefined) {
		displayed.value = { path, content: cached }
		return
	}
	const content = await helm.fetchFile(path)
	if (content === null || selectedPath.value !== path) return
	fileCache.set(key, content)
	displayed.value = { path, content }
}

function firstPathOf(id: TabId, files: HelmFileInfo[] = listing.value ?? []): string | undefined {
	if (id === "templates") return files.find(f => f.path.startsWith("templates/"))?.path
	return singleFileTabs.find(t => t.id === id)?.path
}

function firstTabOf(files: HelmFileInfo[]): TabId | undefined {
	const present = new Set(files.map(f => f.path))
	const single = singleFileTabs.find(t => present.has(t.path))
	if (single) return single.id
	return files.some(f => f.path.startsWith("templates/")) ? "templates" : undefined
}

async function selectTab(id: TabId) {
	activeTab.value = id
	const path = firstPathOf(id)
	if (path) await selectFile(path)
}

async function loadListing(): Promise<HelmFileInfo[] | null> {
	const cached = listingCache.get(digest.value)
	if (cached) return cached
	const files = await helm.fetchFiles()
	if (files) listingCache.set(digest.value, files)
	return files
}

async function open(r: Repository, tag: string, manifestDigest: string) {
	repo.value = r
	tagName.value = tag
	digest.value = manifestDigest
	listing.value = null
	displayed.value = null
	selectedPath.value = ""
	error.value = null

	const openIfSlow = setTimeout(() => {
		isOpen.value = true
	}, slowAfterMs)

	const files = await loadListing()
	const firstTab = files ? firstTabOf(files) : undefined
	const firstPath = firstTab && files ? firstPathOf(firstTab, files) : undefined
	if (firstTab && firstPath) {
		activeTab.value = firstTab
		await selectFile(firstPath)
	}
	listing.value = files

	clearTimeout(openIfSlow)
	isOpen.value = true
}

function close() {
	isOpen.value = false
}

defineExpose({ open, close })
</script>
