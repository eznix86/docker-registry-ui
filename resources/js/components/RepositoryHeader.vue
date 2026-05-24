<template>
	<div class="flex items-start justify-between gap-4 mb-4">
		<h1 class="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight lg:leading-[56.7px] text-foreground break-words min-w-0">
			{{ repositoryName }}
		</h1>
		<button
			v-if="!disableTagDeletion"
			v-ripple
			class="p-2 text-destructive effect-hover-destructive effect-ripple-destructive rounded transition-colors flex-shrink-0"
			aria-label="Delete tags"
			title="Delete tags"
			@click="emit('bulkDelete')"
		>
			<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
				<path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
			</svg>
		</button>
	</div>
</template>

<script setup lang="ts">
import type { Repository } from "~/types"
import { useRepositoryName } from "~/composables/useRepositoryName"

const props = withDefaults(defineProps<{ repository?: Repository, disableTagDeletion?: boolean }>(), {
	repository: undefined,
	disableTagDeletion: false,
})

const emit = defineEmits<{ bulkDelete: [] }>()
const repositoryName = useRepositoryName(() => props.repository)
</script>
