<template>
	<!-- eslint-disable-next-line vue-a11y/no-static-element-interactions -->
	<div v-if="statusCode && !isHealthy" role="group" class="relative py-1 rounded group/status-row cursor-help" @mouseenter="isHovered = true" @mouseleave="isHovered = false" @focusin="isHovered = true" @focusout="isHovered = false">
		<label :for="id" class="flex items-start gap-2">
			<div class="flex h-6 shrink-0 items-center">
				<div class="group grid size-4 grid-cols-1 effect-hover-accent effect-ripple-accent">
					<input
						:id="id"
						:value="value"
						:checked="isChecked"
						type="checkbox"
						:aria-label="label"
						:class="props.class"
						class="col-start-1 row-start-1 appearance-none rounded border-2 border-muted-foreground bg-background checked:border-primary checked:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus cursor-pointer"
						v-bind="$attrs"
						@change="handleChange"
					>
					<svg class="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white" viewBox="0 0 14 14" fill="none">
						<path class="opacity-0 group-has-[:checked]:opacity-100" d="M3 8L6 11L11 3.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
				</div>
			</div>
			<span v-if="label || $slots.default" :class="checkboxLabel({ labelVariant, hasError: true })">
				<slot>{{ label }}</slot>
			</span>

			<!-- Status Code Chip (always visible if error) -->
			<Chip
				variant="warning"
				size="small"
				class="ml-auto shrink-0"
			>
				{{ statusInfo.code }}
			</Chip>
		</label>

		<!-- Status Popover Panel (shown on hover) -->
		<transition
			enter-active-class="transition duration-200 ease-in-out"
			enter-from-class="opacity-0 scale-95"
			enter-to-class="opacity-100 scale-100"
			leave-active-class="transition duration-150 ease-in-out"
			leave-from-class="opacity-100 scale-100"
			leave-to-class="opacity-0 scale-95"
		>
			<div v-show="isHovered" class="absolute left-0 right-0 top-full mt-1 md:left-full md:right-auto md:top-1/2 md:-translate-y-1/2 md:mt-0 md:ml-2 z-10 pointer-events-none">
				<div class="bg-background border border-outline rounded shadow-lg w-full md:w-72 p-3">
					<div class="flex items-start gap-2 mb-2">
						<Chip variant="warning" size="small" class="shrink-0">
							{{ statusInfo.code }}
						</Chip>
						<div class="text-sm font-semibold text-foreground">
							{{ statusInfo.message }}
						</div>
					</div>
					<div class="text-sm text-muted-foreground">
						{{ statusInfo.description }}
					</div>
				</div>
			</div>
		</transition>
	</div>

	<label v-else :for="id" class="relative flex items-start gap-2 py-1 hover:opacity-80 rounded transition-opacity">
		<div class="flex h-6 shrink-0 items-center">
			<div class="group grid size-4 grid-cols-1 effect-hover-accent effect-ripple-accent">
				<input
					:id="id"
					:value="value"
					:checked="isChecked"
					type="checkbox"
					:aria-label="label"
					:class="props.class"
					class="col-start-1 row-start-1 appearance-none rounded border-2 border-muted-foreground bg-background checked:border-primary checked:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus cursor-pointer"
					v-bind="$attrs"
					@change="handleChange"
				>
				<svg class="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white" viewBox="0 0 14 14" fill="none">
					<path class="opacity-0 group-has-[:checked]:opacity-100" d="M3 8L6 11L11 3.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
			</div>
		</div>
		<span v-if="label || $slots.default" :class="checkboxLabel({ labelVariant, hasError: false })">
			<slot>{{ label }}</slot>
		</span>
	</label>
</template>

<script setup lang="ts">
import type { RegistryStatusInfo } from "~/types/registry"
import { computed, ref } from "vue"
import Chip from "~/components/ui/Chip.vue"
import { tv } from "~/lib/utils"
import { getRegistryStatus, isRegistryHealthy } from "~/types/registry"

interface CheckboxProps {
	id: string
	label?: string
	value?: string | number | boolean
	labelVariant?: "default" | "muted"
	class?: string
	statusCode?: number
}

const props = withDefaults(defineProps<CheckboxProps>(), {
	labelVariant: "muted",
	class: "",
})

const model = defineModel<boolean | string[] | number[]>()

// Use tv() for the label with variants
const checkboxLabel = tv({
	base: " min-w-0 flex-1 text-sm select-none leading-6 break-words",
	variants: {
		labelVariant: {
			default: "text-foreground",
			muted: "text-muted-foreground",
		},
		hasError: {
			true: "line-through opacity-60",
			false: "cursor-pointer",
		},
	},
	defaultVariants: {
		labelVariant: "muted",
		hasError: false,
	},
})

const statusInfo = computed<RegistryStatusInfo>(() => {
	return props.statusCode
		? getRegistryStatus(props.statusCode)
		: ({} as RegistryStatusInfo)
})

const isHealthy = computed(() => {
	return props.statusCode ? isRegistryHealthy(props.statusCode) : true
})

// Hover state for popover
const isHovered = ref(false)

const isChecked = computed(() => {
	if (Array.isArray(model.value)) {
		if (typeof props.value === "string") {
			return (model.value as string[]).includes(props.value)
		}
		else if (typeof props.value === "number") {
			return (model.value as number[]).includes(props.value)
		}
		return false
	}
	return model.value
})

function handleChange(event: Event) {
	const target = event.target as HTMLInputElement

	if (Array.isArray(model.value)) {
		if (typeof props.value === "string") {
			const newValue = [...(model.value as string[])]
			if (target.checked) {
				newValue.push(props.value)
			}
			else {
				const index = newValue.indexOf(props.value)
				if (index > -1) {
					newValue.splice(index, 1)
				}
			}
			model.value = newValue
		}
		else if (typeof props.value === "number") {
			const newValue = [...(model.value as number[])]
			if (target.checked) {
				newValue.push(props.value)
			}
			else {
				const index = newValue.indexOf(props.value)
				if (index > -1) {
					newValue.splice(index, 1)
				}
			}
			model.value = newValue
		}
	}
	else {
		model.value = target.checked
	}
}
</script>
