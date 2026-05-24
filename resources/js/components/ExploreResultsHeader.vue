<template>
	<div class="mb-5 flex items-center gap-3">
		<button v-ripple class="lg:hidden w-10 h-10 bg-background rounded-lg border border-outline flex items-center justify-center hover:opacity-80 transition-opacity" aria-label="Open filters menu" @click="emit('toggleSidebar')">
			<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor" class="text-muted-foreground" aria-hidden="true"><path d="M400-240v-80h160v80H400ZM240-440v-80h480v80H240ZM120-640v-80h720v80H120Z" /></svg>
		</button>
		<p class="text-muted-foreground text-sm">
			{{ displayedCount || 0 }} of {{ totalCount }} available results.
		</p>
	</div>
</template>

<script setup lang="ts">
defineProps<{ displayedCount: number, totalCount: number }>()
const emit = defineEmits<{ toggleSidebar: [] }>()
</script>
