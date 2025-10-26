<template>
	<DialogTitle
		as="h2"
		class="text-lg font-semibold leading-6 text-popover-foreground mb-4"
	>
		<slot />
	</DialogTitle>
</template>

<script setup lang="ts">
import { DialogTitle } from "@headlessui/vue"
</script>
