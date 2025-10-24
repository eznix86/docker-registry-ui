<template>
	<Dialog v-model="preferencesStore.isSettingsDialogOpen">
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
							v-for="theme in preferencesStore.themeOptions"
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
							v-for="font in preferencesStore.fontSansOptions"
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
							v-for="font in preferencesStore.fontMonoOptions"
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
							v-for="runtime in preferencesStore.runtimeOptions"
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
import { useAppPreferencesStore } from "~/stores/useAppPreferencesStore"

// Use Pinia store
const preferencesStore = useAppPreferencesStore()

// Theme management
const selectedTheme = computed({
	get: () => preferencesStore.theme,
	set: value => preferencesStore.setTheme(value),
})

const currentThemeLabel = computed(() => preferencesStore.themeLabel)

// Font management
const selectedFontSans = computed({
	get: () => preferencesStore.fontSans,
	set: value => preferencesStore.setFontSans(value),
})

const selectedFontMono = computed({
	get: () => preferencesStore.fontMono,
	set: value => preferencesStore.setFontMono(value),
})

const currentFontSansLabel = computed(() => preferencesStore.fontSansLabel)
const currentFontMonoLabel = computed(() => preferencesStore.fontMonoLabel)

// Container runtime management
const selectedRuntime = computed({
	get: () => preferencesStore.containerRuntime,
	set: value => preferencesStore.setContainerRuntime(value),
})

const currentRuntimeLabel = computed(() => preferencesStore.runtimeLabel)

function handleClose() {
	preferencesStore.closeSettingsDialog()
}
</script>
