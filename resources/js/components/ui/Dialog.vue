<!--
SPDX-License-Identifier: AGPL-3.0-or-later
Copyright (C) 2025  Bruno Bernard

This file is part of Docker Registry UI (Container Hub).

Docker Registry UI is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

Docker Registry UI is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
-->

<template>
	<TransitionRoot appear :show="modelValue" as="template">
		<HeadlessDialog as="div" class="relative z-50" @close="modelValue = false">
			<TransitionChild
				as="template"
				enter="duration-200 ease-out"
				enter-from="opacity-0"
				enter-to="opacity-100"
				leave="duration-200 ease-out"
				leave-from="opacity-100"
				leave-to="opacity-0"
			>
				<div class="fixed inset-0 bg-black/50" />
			</TransitionChild>

			<div class="fixed inset-0 overflow-y-auto">
				<div class="flex min-h-full items-center justify-center p-4 text-center">
					<TransitionChild
						as="template"
						enter="duration-200 ease-out"
						enter-from="opacity-0 scale-95 translate-y-4"
						enter-to="opacity-100 scale-100 translate-y-0"
						leave="duration-200 ease-out"
						leave-from="opacity-100 scale-100 translate-y-0"
						leave-to="opacity-0 scale-95 translate-y-4"
					>
						<DialogPanel class="w-full max-w-md transform overflow-visible rounded-2xl bg-popover p-6 text-left align-middle shadow-xl transition-all">
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
