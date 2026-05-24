<template>
	<component :is="as" :class="footer({ class: props.class })" v-bind="$attrs">
		<slot />
	</component>
</template>

<script setup lang="ts">
import { tv } from "~/lib/utils"

defineOptions({
	inheritAttrs: false,
})

const props = withDefaults(defineProps<CardFooterProps>(), {
	as: "div",
	class: "",
})

interface CardFooterProps {
	as?: string
	class?: string
}

const footer = tv({
	base: "flex justify-between items-center text-sm mt-auto",
})
</script>
