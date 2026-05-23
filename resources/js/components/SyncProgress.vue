


<template>
	<div v-if="shouldShow" class="w-full space-y-2 mb-4">
		<!-- Progress Bar with Percentage -->
		<div v-if="total > 0" class="flex items-center gap-2">
			<div class="relative h-2 w-64 overflow-hidden rounded-full bg-muted">
				<div
					class="h-full bg-primary transition-all duration-500 ease-linear"
					:style="{ width: `${smoothPercent}%` }"
				/>
			</div>
			<span class="text-xs font-mono text-muted-foreground tabular-nums">{{ smoothPercent.toFixed(0) }}%</span>
		</div>

		<!-- Step and Message -->
		<div v-auto-animate class="text-sm text-muted-foreground">
			<template v-if="total > 0">
				<span v-if="step" class="text-muted-foreground/50">[{{ step }}]</span>
				<span class="font-medium ml-2">{{ message }}</span>
			</template>
			<span v-else-if="!connected" class="text-warning">Connecting...</span>
		</div>
	</div>
</template>

<script setup lang="ts">
import { refDebounced } from "@vueuse/core"
import { storeToRefs } from "pinia"
import { computed } from "vue"
import { useSyncProgressStore } from "~/stores/useSyncProgressStore"

const store = useSyncProgressStore()
const { total, message, step, connected, done, percent, hideAfterComplete } = storeToRefs(store)

// Smooth percentage transition with debounce
const smoothPercent = refDebounced(percent, 50)

const shouldShow = computed(() => {
	if (hideAfterComplete.value)
		return false
	return connected.value || total.value > 0 || done.value
})
</script>
