<template>
	<Dialog v-model="tagDeleteStore.isOpen">
		<DialogTitle>Delete Tag</DialogTitle>

		<p class="text-foreground mb-6">
			Are you sure you want to delete the tag <strong>{{ tagDeleteStore.selectedTag?.name }}</strong>? This action cannot be undone.
		</p>

		<div class="flex justify-end gap-3">
			<Button variant="ghost" @click="tagDeleteStore.closeDialog">
				CANCEL
			</Button>
			<Button variant="destructive" @click="tagDeleteStore.confirmDelete">
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
import { useTagDeleteStore } from "~/stores/useTagDeleteStore"

const tagDeleteStore = useTagDeleteStore()
</script>
