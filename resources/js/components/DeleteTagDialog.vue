<template>
	<Dialog :model-value="true" @update:model-value="close">
		<DialogTitle>Delete Tag</DialogTitle>

		<p class="text-foreground mb-6">
			Are you sure you want to delete the tag <strong>{{ tag.name }}</strong>? This action cannot be undone.
		</p>

		<p v-if="error" class="text-red-500 mb-4">
			{{ error }}
		</p>

		<div class="flex justify-end gap-3">
			<Button variant="ghost" :disabled="deleting" @click="close">
				CANCEL
			</Button>
			<Button variant="destructive" :disabled="deleting" @click="confirm">
				{{ deleting ? 'DELETING...' : 'DELETE TAG' }}
			</Button>
		</div>
	</Dialog>
</template>

<script setup lang="ts">
import type { Tag } from "~/types"
import { router } from "@inertiajs/vue3"
import { ref } from "vue"
import { Button, Dialog, DialogTitle } from "~/components/ui"
import { currentTagsPath } from "~/lib/routes"

const props = defineProps<{ tag: Tag }>()
const emit = defineEmits<{ close: [] }>()

const deleting = ref(false)
const error = ref<string | null>(null)

function close() {
	emit("close")
}

async function confirm() {
	deleting.value = true
	error.value = null
	try {
		const resp = await fetch(currentTagsPath(), {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ tags: [props.tag.name] }),
		})
		if (!resp.ok)
			throw new Error((await resp.json()).error || "Deletion failed")
		const result = await resp.json()
		if (result.failed > 0)
			throw new Error(result.errors?.[props.tag.name] || "Deletion failed")
		close()
		router.reload({ only: [] })
	}
	catch (e: any) {
		error.value = e.message
	}
	finally {
		deleting.value = false
	}
}
</script>
