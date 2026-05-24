<template>
	<Dialog :model-value="isOpen" wide @update:model-value="close">
		<DialogTitle>Untagged Repository</DialogTitle>

		<p class="text-muted-foreground text-sm mb-6">
			This repository has no tagged images and cannot be pulled.
		</p>

		<div class="border border-outline rounded-lg p-4 mb-3">
			<div class="flex items-center gap-2 mb-3">
				<svg class="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
				<span class="text-sm font-medium text-foreground">Manual Cleanup</span>
			</div>
			<CopyCommand command="registry garbage-collect /etc/docker/registry/config.yml" aria-label="Copy GC command" class="mb-2" />
			<p class="text-xs text-muted-foreground">
				Then remove <code class="bg-muted px-1 rounded text-xs">{{ repo?.name }}</code> from <code class="bg-muted px-1 rounded text-xs break-all">/var/lib/registry/docker/registry/v2/repositories/</code>
			</p>
		</div>

		<div class="border border-primary/30 rounded-lg p-4 bg-linear-to-r from-primary/5 to-primary/10">
			<div class="flex items-center gap-2 mb-1">
				<svg class="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.51 11.51 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" /></svg>
				<span class="text-sm font-semibold text-foreground">Automated Cleanup</span>
				<span class="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/20 text-primary">Recommended</span>
			</div>
			<p class="text-xs text-muted-foreground mb-2">
				Let <a href="https://github.com/eznix86/docker-registry-cleaner" target="_blank" class="text-primary font-medium hover:underline">docker-registry-cleaner</a> handle this for you.
			</p>
			<p class="text-xs text-muted-foreground">
				Removes untagged manifests, orphaned blobs, and runs garbage collection.
			</p>
		</div>

		<div class="flex justify-end mt-6">
			<Button @click="close">
				CLOSE
			</Button>
		</div>
	</Dialog>
</template>

<script setup lang="ts">
import type { Repository } from "~/types"
import { ref } from "vue"
import { Button, CopyCommand, Dialog, DialogTitle } from "~/components/ui"

const isOpen = ref(false)
const repo = ref<Repository | null>(null)

function open(r: Repository) {
	repo.value = r
	isOpen.value = true
}

function close() {
	isOpen.value = false
	repo.value = null
}

defineExpose({ open, close })
</script>
