<template>
	<component :is="as" :class="body({ class: props.class })" v-bind="$attrs">
		<slot />
	</component>
</template>

<script setup lang="ts">
import { tv } from "~/lib/utils"

defineOptions({
	inheritAttrs: false,
})

const props = withDefaults(defineProps<CardBodyProps>(), {
	as: "div",
	class: "",
})

interface CardBodyProps {
	as?: string
	class?: string
}

const body = tv({
	base: "flex-1",
})
</script>
