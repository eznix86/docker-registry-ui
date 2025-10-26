<template>
	<Listbox v-model="model" v-bind="$attrs">
		<div class="relative w-full">
			<slot />
		</div>
	</Listbox>
</template>

<script setup lang="ts">
import { Listbox } from "@headlessui/vue"

defineOptions({
	inheritAttrs: false,
})

const model = defineModel<string | number | undefined>()
</script>
