<template>
	<component :is="as" :class="header({ class: props.class })" v-bind="$attrs">
		<slot />
	</component>
</template>

<script setup lang="ts">
import { tv } from "~/lib/utils"

defineOptions({
	inheritAttrs: false,
})

const props = withDefaults(defineProps<CardHeaderProps>(), {
	as: "h3",
	class: "",
})

interface CardHeaderProps {
	as?: string
	class?: string
}

const header = tv({
	base: "text-sm sm:text-base font-semibold mb-2 text-card-foreground",
})
</script>
