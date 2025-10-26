<template>
	<button
		v-ripple
		type="button"
		class="relative flex items-center px-3 py-2 text-sm text-foreground bg-card border border-outline rounded hover:opacity-80 transition-all duration-200 ease-in-out overflow-hidden group active:translate-y-0.5 w-full sm:w-auto min-h-8"
		:aria-label="ariaLabel"
		@click="copy(command)"
	>
		<span class="truncate text-xs md:text-sm font-mono text-foreground">{{ command }}</span>
		<span
			class="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs rounded transition-all duration-200 pointer-events-none whitespace-nowrap z-10"
			:class="copied
				? 'bg-success text-success-foreground opacity-100'
				: 'bg-primary text-primary-foreground opacity-0 group-hover:opacity-100'"
		>
			{{ copied ? 'Copied' : 'Copy' }}
		</span>
	</button>
</template>

<script setup lang="ts">
import { useClipboard } from "@vueuse/core"

interface CopyCommandProps {
	command: string
	ariaLabel?: string
}

withDefaults(defineProps<CopyCommandProps>(), {
	ariaLabel: "Copy command",
})

// Use VueUse clipboard with 2-second timeout
const { copy, copied } = useClipboard({ legacy: true })
</script>
