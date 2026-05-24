<template>
	<Dialog v-model="isOpen">
		<DialogTitle>Settings</DialogTitle>

		<div class="mt-4">
			<div class="block">
				<span id="theme-label" class="text-sm font-medium text-popover-foreground mb-2 block">Theme</span>
				<Select v-model="selectedTheme" aria-labelledby="theme-label">
					<SelectTrigger aria-labelledby="theme-label">
						{{ themeLabel }}
					</SelectTrigger>
					<SelectContent>
						<SelectItem
							v-for="t in THEME_OPTIONS"
							:key="t.value"
							:value="t.value"
							:label="t.label"
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
						{{ fontSansLabel }}
					</SelectTrigger>
					<SelectContent>
						<SelectItem
							v-for="font in FONT_SANS_OPTIONS"
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
						{{ fontMonoLabel }}
					</SelectTrigger>
					<SelectContent>
						<SelectItem
							v-for="font in FONT_MONO_OPTIONS"
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
						{{ runtimeLabel }}
					</SelectTrigger>
					<SelectContent>
						<SelectItem
							v-for="rt in RUNTIME_OPTIONS"
							:key="rt.value"
							:value="rt.value"
							:label="rt.label"
						/>
					</SelectContent>
				</Select>
			</div>
		</div>

		<div class="mt-6 flex justify-end">
			<Button variant="default" @click="isOpen = false">
				CLOSE
			</Button>
		</div>
	</Dialog>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { Button, Dialog, DialogTitle, Select, SelectContent, SelectItem, SelectTrigger } from "~/components/ui"
import { FONT_MONO_OPTIONS, FONT_SANS_OPTIONS, isSettingsOpen, RUNTIME_OPTIONS, THEME_OPTIONS, usePreferences } from "~/composables/usePreferences"

const isOpen = isSettingsOpen
const { theme, fontSans, fontMono, containerRuntime } = usePreferences()

const selectedTheme = computed({ get: () => theme.value, set: v => theme.value = v })
const selectedFontSans = computed({ get: () => fontSans.value, set: v => fontSans.value = v })
const selectedFontMono = computed({ get: () => fontMono.value, set: v => fontMono.value = v })
const selectedRuntime = computed({ get: () => containerRuntime.value, set: v => containerRuntime.value = v })

const themeLabel = computed(() => THEME_OPTIONS.find(t => t.value === theme.value)?.label || theme.value)
const fontSansLabel = computed(() => FONT_SANS_OPTIONS.find(f => f.value === fontSans.value)?.label || fontSans.value)
const fontMonoLabel = computed(() => FONT_MONO_OPTIONS.find(f => f.value === fontMono.value)?.label || fontMono.value)
const runtimeLabel = computed(() => RUNTIME_OPTIONS.find(r => r.value === containerRuntime.value)?.label || containerRuntime.value)
</script>
