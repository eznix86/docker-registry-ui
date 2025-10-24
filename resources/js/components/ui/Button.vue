<template>
	<component :is="as" v-ripple :type="type" :class="button({ variant, size, class: props.class })" v-bind="$attrs">
		<slot />
	</component>
</template>

<script setup lang="ts">
import { tv } from "~/lib/utils"

defineOptions({
	inheritAttrs: false,
})

const props = withDefaults(defineProps<ButtonProps>(), {
	as: "button",
	type: "button",
	variant: "default",
	size: "md",
	class: "",
})

interface ButtonProps {
	as?: string
	type?: "button" | "submit" | "reset"
	variant?: "default" | "ghost" | "icon" | "destructive"
	size?: "sm" | "md" | "lg"
	class?: string
}

const button = tv({
	base: "inline-flex items-center justify-center rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/20 disabled:pointer-events-none disabled:opacity-50",
	variants: {
		variant: {
			default: "bg-primary text-primary-foreground hover:bg-accent",
			ghost: "hover:opacity-80 text-muted-foreground",
			icon: "hover:bg-white/10 rounded-full",
			destructive:
				"bg-destructive text-destructive-foreground hover:opacity-90",
		},
		size: {
			sm: "h-8 px-3 text-xs",
			md: "h-10 px-4 text-sm",
			lg: "h-12 px-6 text-base",
		},
	},
	defaultVariants: {
		variant: "default",
		size: "md",
	},
})
</script>
