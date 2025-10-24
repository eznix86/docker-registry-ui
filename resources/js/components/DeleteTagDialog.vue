<template>
	<Dialog v-model="isOpen">
		<DialogTitle>Delete Tag</DialogTitle>

		<p class="text-foreground mb-6">
			Are you sure you want to delete the tag <strong>{{ tagName }}</strong>? This action cannot be undone.
		</p>

		<div class="flex justify-end gap-3">
			<Button variant="ghost" @click="emit('close')">
				CANCEL
			</Button>
			<Button variant="destructive" @click="emit('confirmDelete')">
				DELETE TAG
			</Button>
		</div>
	</Dialog>
</template>

<script setup lang="ts">
import {
	Button,
	Dialog,
	DialogTitle,
} from "~/components/ui"

interface DeleteTagDialogProps {
	tagName?: string
}

defineProps<DeleteTagDialogProps>()

const emit = defineEmits<{
	close: []
	confirmDelete: []
}>()

const isOpen = defineModel<boolean>({ required: true })
</script>
