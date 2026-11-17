<template>
	<Dialog :model-value="isOpen" wide @update:model-value="close">
		<DialogTitle>{{ repo?.name }}</DialogTitle>
		<p class="mb-4 text-sm text-muted-foreground">Chart version {{ tagName }}</p>

		<HelmChartFiles v-if="repo" :repository="repo" :tag-name="tagName" :digest="digest" />

		<div class="mt-6 flex justify-end">
			<Button @click="close"> CLOSE </Button>
		</div>
	</Dialog>
</template>

<script setup lang="ts">
import { ref } from "vue"

import HelmChartFiles from "~/components/helm/HelmChartFiles.vue"
import { Button, Dialog, DialogTitle } from "~/components/ui"
import type { Repository } from "~/types"

const isOpen = ref(false)
const repo = ref<Repository | null>(null)
const tagName = ref("")
const digest = ref("")

function open(r: Repository, tag: string, manifestDigest: string) {
	repo.value = r
	tagName.value = tag
	digest.value = manifestDigest
	isOpen.value = true
}

function close() {
	isOpen.value = false
}

defineExpose({ open, close })
</script>
