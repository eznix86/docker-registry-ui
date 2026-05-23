<template>
	<Dialog :model-value="isOpen" @update:model-value="close">
		<DialogTitle>Select Tags to Delete</DialogTitle>
		<p class="text-muted-foreground mb-4">Select tags to delete. This cannot be undone.</p>

		<div class="mb-4 pb-4 border-b border-outline flex items-center justify-between">
			<Checkbox id="select-all-tags" :model-value="selectAll" :disabled="isDeleting || tags.length === 0" :label="tags.length > 0 ? `Select All (${tags.length} tags)` : 'Select All'" label-variant="default" @update:model-value="(v: any) => toggleAll(v as boolean)" />
			<span class="text-sm text-muted-foreground">{{ tags.length === 0 ? 'Loading...' : `${tags.length} of ${totalTagsCount} tags` }}</span>
		</div>

		<div v-if="isDeleting" class="border border-outline rounded-lg p-4 text-sm text-muted-foreground mb-6">Loading all tags...</div>
		<div v-else-if="tags.length === 0" class="border border-outline rounded-lg p-4 text-sm text-muted-foreground mb-6">No tags available.</div>
		<div v-else class="max-h-96 overflow-y-auto space-y-2 mb-6">
			<div v-for="tag in tags" :key="tag.name" class="border border-outline rounded-lg p-3 hover:bg-muted/50 transition-colors">
				<Checkbox :id="`tag-${tag.name}`" :model-value="selectedTags" :value="tag.name" label-variant="default" @update:model-value="(v: any) => setSelected(v as string[])">
					<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
						<span class="font-medium text-foreground">{{ tag.name }}</span>
						<span class="text-sm text-muted-foreground">{{ tag.images.length }} image{{ tag.images.length !== 1 ? 's' : '' }} &bull; {{ calculateTagSize(tag) }}</span>
					</div>
				</Checkbox>
			</div>
		</div>

		<p v-if="deleteError" class="text-red-500 mb-4">{{ deleteError }}</p>

		<div class="flex justify-end gap-3">
			<Button variant="ghost" :disabled="isDeleting" @click="close">CANCEL</Button>
			<Button variant="destructive" :disabled="selectedTags.length === 0 || isDeleting" @click="confirmDelete">
				{{ isDeleting ? 'DELETING...' : `DELETE ${selectedTags.length} TAG${selectedTags.length !== 1 ? 'S' : ''}` }}
			</Button>
		</div>
	</Dialog>
</template>

<script setup lang="ts">
import type { Tag } from "~/types"
import { computed, ref } from "vue"
import { router } from "@inertiajs/vue3"
import { Button, Checkbox, Dialog, DialogTitle } from "~/components/ui"
import { formatBytes } from "~/lib/utils"
import { currentTagsPath } from "~/lib/routes"

const props = withDefaults(defineProps<{
	tags: Tag[]
	totalTagsCount: number
	open?: boolean
}>(), { open: false })

const isOpen = ref(props.open)
const selectedTags = ref<string[]>([])
const isDeleting = ref(false)
const deleteError = ref<string | null>(null)

function close() { isOpen.value = false; selectedTags.value = []; deleteError.value = null }
function open() { isOpen.value = true; selectedTags.value = []; deleteError.value = null; router.reload({ only: ["bulkDeleteTags"] }) }
function setSelected(v: string[]) { selectedTags.value = v }
function toggleAll(v: any) { selectedTags.value = Boolean(v) ? props.tags.map(t => t.name) : [] }

const selectAll = computed(() => props.tags.length > 0 && props.tags.every(t => selectedTags.value.includes(t.name)))

async function confirmDelete() {
	if (selectedTags.value.length === 0) return
	isDeleting.value = true; deleteError.value = null
	try {
		const resp = await fetch(currentTagsPath(), { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tags: selectedTags.value }) })
		if (!resp.ok) throw new Error((await resp.json()).error || "Deletion failed")
		const result = await resp.json()
		if (result.failed > 0) { deleteError.value = `Deleted ${result.deleted}, failed ${result.failed}`; return }
		close(); router.reload({ only: [] })
	} catch (e: any) { deleteError.value = e.message } finally { isDeleting.value = false }
}

function calculateTagSize(tag: Tag): string { return formatBytes(tag.images.reduce((s, i) => s + i.size, 0)) }

defineExpose({ open, close })
</script>
