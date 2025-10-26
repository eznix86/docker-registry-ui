<template>
	<transition
		leave-active-class="transition duration-100 ease-out"
		leave-from-class="opacity-100"
		leave-to-class="opacity-0"
	>
		<ListboxOptions class="absolute z-[9999] mt-1 max-h-60 w-full overflow-auto rounded-lg bg-popover py-1 text-base shadow-lg border border-outline sm:text-sm focus:outline-hidden">
			<slot />
		</ListboxOptions>
	</transition>
</template>

<script setup lang="ts">
import { ListboxOptions } from "@headlessui/vue"
</script>
