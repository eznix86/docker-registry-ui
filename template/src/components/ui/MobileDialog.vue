<template>
	<TransitionRoot appear :show="modelValue" as="template">
		<HeadlessDialog as="div" class="relative z-50 lg:hidden" @close="modelValue = false">
			<TransitionChild
				as="template"
				enter="duration-300 ease-out"
				enter-from="opacity-0"
				enter-to="opacity-100"
				leave="duration-300 ease-out"
				leave-from="opacity-100"
				leave-to="opacity-0"
			>
				<div class="fixed inset-0 bg-black/50" />
			</TransitionChild>

			<div class="fixed inset-0 overflow-hidden">
				<div class="absolute inset-0 overflow-hidden">
					<TransitionChild
						as="template"
						enter="transform transition ease-in-out duration-300"
						enter-from="-translate-x-full"
						enter-to="translate-x-0"
						leave="transform transition ease-in-out duration-300"
						leave-from="translate-x-0"
						leave-to="-translate-x-full"
					>
						<DialogPanel class="fixed inset-y-0 left-0 w-80 bg-background shadow-xl">
							<slot />
						</DialogPanel>
					</TransitionChild>
				</div>
			</div>
		</HeadlessDialog>
	</TransitionRoot>
</template>

<script setup lang="ts">
import {
	DialogPanel,
	Dialog as HeadlessDialog,
	TransitionChild,
	TransitionRoot,
} from "@headlessui/vue"

const modelValue = defineModel<boolean>({ required: true })
</script>
