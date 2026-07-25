<template>
	<button
		v-ripple
		type="button"
		class="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:translate-y-0.5"
		:class="copied ? 'text-success' : ''"
		:aria-label="copied ? 'Copied' : ariaLabel"
		:title="copied ? 'Copied' : ariaLabel"
		@click="copy(value)"
	>
		<svg
			class="h-4 w-4"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			viewBox="0 0 24 24"
			aria-hidden="true"
		>
			<polyline v-if="copied" points="20 6 9 17 4 12" />
			<template v-else>
				<rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
				<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
			</template>
		</svg>
	</button>
</template>

<script setup lang="ts">
import { useClipboard } from "@vueuse/core"

interface CopyButtonProps {
	value: string
	ariaLabel?: string
}

withDefaults(defineProps<CopyButtonProps>(), {
	ariaLabel: "Copy",
})

const { copy, copied } = useClipboard({ legacy: true, copiedDuring: 2000 })
</script>
