<template>
	<Dialog v-model="settingsStore.isOpen">
		<DialogTitle>Settings</DialogTitle>

		<div class="mt-4">
			<div class="block">
				<span id="theme-label" class="text-sm font-medium text-popover-foreground mb-2 block">Theme</span>
				<Select v-model="selectedTheme" aria-labelledby="theme-label">
					<SelectTrigger aria-labelledby="theme-label">
						{{ currentThemeLabel }}
					</SelectTrigger>

					<SelectContent>
						<SelectItem
							v-for="theme in themeOptions"
							:key="theme.value"
							:value="theme.value"
							:label="theme.label"
						/>
					</SelectContent>
				</Select>
			</div>
		</div>

		<div class="mt-4">
			<div class="block">
				<span id="general-font-label" class="text-sm font-medium text-popover-foreground mb-2 block">General Font</span>
				<Select v-model="selectedFontSans" aria-labelledby="general-font-label">
					<SelectTrigger aria-labelledby="general-font-label">
						{{ currentFontSansLabel }}
					</SelectTrigger>

					<SelectContent>
						<SelectItem
							v-for="font in fontSansOptions"
							:key="font.value"
							:value="font.value"
							:label="font.label"
						/>
					</SelectContent>
				</Select>
			</div>
		</div>

		<div class="mt-4">
			<div class="block">
				<span id="code-font-label" class="text-sm font-medium text-popover-foreground mb-2 block">Code Font</span>
				<Select v-model="selectedFontMono" aria-labelledby="code-font-label">
					<SelectTrigger aria-labelledby="code-font-label">
						{{ currentFontMonoLabel }}
					</SelectTrigger>

					<SelectContent>
						<SelectItem
							v-for="font in fontMonoOptions"
							:key="font.value"
							:value="font.value"
							:label="font.label"
						/>
					</SelectContent>
				</Select>
			</div>
		</div>

		<div class="mt-4">
			<div class="block">
				<span id="container-runtime-label" class="text-sm font-medium text-popover-foreground mb-2 block">Container Runtime</span>
				<Select v-model="selectedRuntime" aria-labelledby="container-runtime-label">
					<SelectTrigger aria-labelledby="container-runtime-label">
						{{ currentRuntimeLabel }}
					</SelectTrigger>

					<SelectContent>
						<SelectItem
							v-for="runtime in runtimeOptions"
							:key="runtime.value"
							:value="runtime.value"
							:label="runtime.label"
						/>
					</SelectContent>
				</Select>
			</div>
		</div>

		<div class="mt-6 flex justify-end">
			<Button variant="default" @click="handleClose">
				CLOSE
			</Button>
		</div>
	</Dialog>
</template>

<script setup lang="ts">
import { computed } from "vue"
import {
	Button,
	Dialog,
	DialogTitle,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "~/components/ui"
import { useContainerRuntime } from "~/composables/useContainerRuntime"
import { useFonts } from "~/composables/useFonts"
import { useTheme } from "~/composables/useTheme"
import { useSettingsStore } from "~/stores/useSettingsStore"

// Use Pinia store
const settingsStore = useSettingsStore()

// Theme management
const { currentTheme, setTheme, getThemeLabel, themeOptions } = useTheme()

const selectedTheme = computed({
	get: () => currentTheme.value,
	set: value => setTheme(value),
})

const currentThemeLabel = computed(() => getThemeLabel(currentTheme.value))

// Font management
const {
	currentFontSans,
	currentFontMono,
	setFontSans,
	setFontMono,
	getFontSansLabel,
	getFontMonoLabel,
	fontSansOptions,
	fontMonoOptions,
} = useFonts()

const selectedFontSans = computed({
	get: () => currentFontSans.value,
	set: value => setFontSans(value),
})

const selectedFontMono = computed({
	get: () => currentFontMono.value,
	set: value => setFontMono(value),
})

const currentFontSansLabel = computed(() => getFontSansLabel(currentFontSans.value))
const currentFontMonoLabel = computed(() => getFontMonoLabel(currentFontMono.value))

// Container runtime management
const {
	currentRuntime,
	setRuntime,
	getRuntimeLabel,
	runtimeOptions,
} = useContainerRuntime()

const selectedRuntime = computed({
	get: () => currentRuntime.value,
	set: value => setRuntime(value),
})

const currentRuntimeLabel = computed(() => getRuntimeLabel(currentRuntime.value))

function handleClose() {
	settingsStore.closeDialog()
}
</script>
