<template>
	<ListboxOption
		v-slot="{ active, selected }"
		:value="value"
		as="template"
	>
		<li
			class="relative cursor-default py-2 pr-9 pl-3 select-none outline-hidden transition-colors"
			:class="{
				'bg-primary text-primary-foreground': active || selected,
				'text-popover-foreground': !active && !selected,
			}"
		>
			<span class="block truncate">
				<slot>{{ label }}</slot>
			</span>
		</li>
	</ListboxOption>
</template>

<script setup lang="ts">
import { ListboxOption } from "@headlessui/vue"

interface SelectItemProps {
	value: string
	label?: string
}

defineProps<SelectItemProps>()
</script>
