<template>
	<ListboxButton v-bind="$attrs" class="grid w-full cursor-default grid-cols-1 rounded-md bg-background py-2 pr-2 pl-3 text-left text-foreground outline-1 -outline-offset-1 outline-field focus:outline-2 focus:-outline-offset-2 focus:outline-focus text-sm/6">
		<span class="col-start-1 row-start-1 truncate pr-6 flex items-center">
			<slot>{{ placeholder }}</slot>
		</span>
		<span class="pointer-events-none col-start-1 row-start-1 mr-2 flex items-center self-center justify-self-end">
			<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" class="size-5 text-muted-foreground sm:size-4">
				<path d="M5.22 10.22a.75.75 0 0 1 1.06 0L8 11.94l1.72-1.72a.75.75 0 1 1 1.06 1.06l-2.25 2.25a.75.75 0 0 1-1.06 0l-2.25-2.25a.75.75 0 0 1 0-1.06ZM10.78 5.78a.75.75 0 0 1-1.06 0L8 4.06 6.28 5.78a.75.75 0 0 1-1.06-1.06l2.25-2.25a.75.75 0 0 1 1.06 0l2.25 2.25a.75.75 0 0 1 0 1.06Z" clip-rule="evenodd" fill-rule="evenodd" />
			</svg>
		</span>
	</ListboxButton>
</template>

<script setup lang="ts">
import { ListboxButton } from "@headlessui/vue"

interface SelectTriggerProps {
	placeholder?: string
}

defineOptions({
	inheritAttrs: false,
})

defineProps<SelectTriggerProps>()
</script>
