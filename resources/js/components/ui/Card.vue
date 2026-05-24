<template>
	<component :is="as" :class="card({ variant, class: props.class })" v-bind="$attrs">
		<slot />
	</component>
</template>

<script setup lang="ts">
import { tv } from "~/lib/utils"

defineOptions({
	inheritAttrs: false,
})

const props = withDefaults(defineProps<CardProps>(), {
	as: "div",
	variant: "default",
	class: "",
})

interface CardProps {
	as?: string
	variant?: "default" | "interactive"
	class?: string
}

const card = tv({
	base: "flex flex-col border border-outline rounded-lg shadow-[0_1px_3px_0_rgba(0,0,0,0.05)]",
	variants: {
		variant: {
			default: "bg-card",
			interactive:
				"bg-transparent hover:bg-card hover:border-primary hover:outline-2 hover:outline-primary hover:shadow-[0_0_0_1px_var(--accent)] hover:opacity-95 transition-[background-color,opacity,border-color,box-shadow,outline] duration-200 cursor-pointer",
		},
	},
	defaultVariants: {
		variant: "default",
	},
})
</script>
