<template>
	<Dialog :model-value="isOpen" wide @update:model-value="close">
		<DialogTitle>{{ title }}</DialogTitle>
		<p class="mb-4 text-sm text-muted-foreground">
			{{ subtitle }}
		</p>

		<div v-if="loading" class="flex items-center justify-center py-12 text-sm text-muted-foreground">
			<svg class="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
				<circle cx="12" cy="12" r="10" stroke-width="3" stroke-opacity="0.25" />
				<path d="M12 2a10 10 0 0110 10" stroke-width="3" stroke-linecap="round" />
			</svg>
			Loading chart…
		</div>

		<div v-else-if="error" class="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
			{{ error }}
		</div>

		<template v-else-if="mode === 'values'">
			<div v-if="!valuesContent" class="rounded-lg border border-outline bg-muted/30 p-4 text-sm text-muted-foreground">
				This chart has no <code class="font-mono text-xs">values.yaml</code> file.
			</div>
			<div v-else class="overflow-hidden rounded-lg border border-outline">
				<div class="flex items-center border-b border-outline bg-muted/40 px-3 py-1.5">
					<span class="font-mono text-xs text-muted-foreground">values.yaml</span>
				</div>
				<div class="max-h-[60vh] overflow-auto bg-background">
					<CodeBlock :code="valuesContent" />
				</div>
			</div>
		</template>

		<template v-else>
			<div v-if="!files || files.length === 0" class="rounded-lg border border-outline bg-muted/30 p-4 text-sm text-muted-foreground">
				This chart has no template files.
			</div>
			<div v-else class="grid grid-cols-1 gap-3 sm:grid-cols-[14rem_1fr]">
				<nav class="max-h-[60vh] overflow-auto rounded-lg border border-outline bg-background">
					<ul class="divide-y divide-outline">
						<li
							v-for="file in files"
							:key="file.path"
						>
							<button
								type="button"
								class="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-mono transition-colors"
								:class="selectedFile?.path === file.path ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'"
								:aria-label="`View ${file.path}`"
								@click="selectedFile = file"
							>
								<span class="truncate">{{ file.path }}</span>
							</button>
						</li>
					</ul>
				</nav>
				<div class="overflow-hidden rounded-lg border border-outline">
					<div class="flex items-center border-b border-outline bg-muted/40 px-3 py-1.5">
						<span class="font-mono text-xs text-muted-foreground">{{ selectedFile?.path || "Select a file" }}</span>
					</div>
					<div v-if="selectedFile" class="max-h-[60vh] overflow-auto bg-background">
						<CodeBlock :code="selectedFile.content" />
					</div>
					<div v-else class="flex h-32 items-center justify-center text-sm text-muted-foreground">
						Pick a file from the list to preview it.
					</div>
				</div>
			</div>
		</template>

		<div class="mt-6 flex justify-end">
			<Button @click="close">
				CLOSE
			</Button>
		</div>
	</Dialog>
</template>

<script setup lang="ts">
import type { HelmFile } from "~/composables/useHelmChart"
import type { Repository } from "~/types"
import { computed, ref, watch } from "vue"
import { Button, CodeBlock, Dialog, DialogTitle } from "~/components/ui"
import { useHelmChart } from "~/composables/useHelmChart"

type Mode = "values" | "files"

const isOpen = ref(false)
const mode = ref<Mode>("values")
const repo = ref<Repository | null>(null)
const tagName = ref("")

const registryHost = ref("")
const namespace = ref("")

const helm = useHelmChart({
	registryHost,
	namespace,
	repository: computed(() => repo.value ?? ({ id: 0, name: "", namespace: "" } as Repository)),
	tagName,
})

const valuesContent = ref<string | null>(null)
const files = ref<HelmFile[]>([])
const selectedFile = ref<HelmFile | null>(null)
const error = helm.error
const loading = helm.loading

const title = computed(() => {
	if (!repo.value)
		return "Chart"
	return mode.value === "values" ? "Default values" : "Templates"
})

const subtitle = computed(() => {
	if (!repo.value)
		return ""
	return `${repo.value.name} · ${tagName.value}`
})

async function load() {
	valuesContent.value = null
	files.value = []
	selectedFile.value = null
	if (!repo.value)
		return

	if (mode.value === "values") {
		valuesContent.value = await helm.fetchValues()
	}
	else {
		const data = await helm.fetchFiles()
		if (data) {
			files.value = data.files
			selectedFile.value = data.files[0] ?? null
		}
	}
}

function getRepoMeta(r: Repository): { registryHost: string, namespace: string } {
	const rAny = r as unknown as { registryHost?: string, registry?: string }
	const reg = rAny.registryHost ?? rAny.registry ?? ""
	return { registryHost: reg, namespace: r.namespace ?? "" }
}

function open(r: Repository, tag: string, m: Mode) {
	const meta = getRepoMeta(r)
	registryHost.value = meta.registryHost
	namespace.value = meta.namespace
	repo.value = r
	tagName.value = tag
	mode.value = m
	isOpen.value = true
	load()
}

function close() {
	isOpen.value = false
	repo.value = null
}

watch(mode, () => {
	if (isOpen.value)
		load()
})

defineExpose({ open, close })
</script>
