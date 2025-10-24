<template>
	<component :is="as" :class="chip({ size, variant, class: props.class })" v-bind="$attrs">
		<slot />
	</component>
</template>

<script setup lang="ts">
import { tv } from "~/lib/utils"

defineOptions({
	inheritAttrs: false,
})

const props = withDefaults(defineProps<ChipProps>(), {
	as: "span",
	variant: "outlined",
	size: "small",
	class: "",
})

interface ChipProps {
	as?: string
	variant?: "default" | "outlined" | "blue" | "warning"
	size?: "small" | "normal"
	class?: string
}

const chip = tv({
	base: "inline-flex items-center",
	variants: {
		size: {
			small: "h-[18px] text-xs leading-[16.8px] px-1 rounded-2xl",
			normal: "h-[26px] text-sm px-2 rounded-[20px]",
		},
		variant: {
			outlined: "text-muted-foreground border border-outline",
			default: "text-muted-foreground bg-muted",
			blue: "text-info border border-info",
			warning: "text-warning border border-warning",
		},
	},
	defaultVariants: {
		size: "small",
		variant: "outlined",
	},
})
</script>
