// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025  Bruno Bernard
//
// This file is part of Docker Registry UI (Container Hub).
//
// Docker Registry UI is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
//
// Docker Registry UI is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.

import { useLocalStorage } from "@vueuse/core"
import { defineStore } from "pinia"
import { computed, ref, watch } from "vue"

export type Theme
	= | "the-hub-light"
		| "the-hub-dark"
		| "monokai"
		| "nord-dark"
		| "nord-light"
		| "one-dark"
		| "tokyo-night"
		| "cyberpunk"
		| "github-dark"
		| "github-light"
		| "catppuccin-mocha"
		| "catppuccin-latte"

export type FontSans
	= | "roboto"
		| "inter"
		| "instrument-sans"
		| "jetbrains-sans"
		| "geist"
		| "nacelle"
		| "ibm-plex-sans"
		| "space-grotesk"
		| "dm-sans"
		| "onest"

export type FontMono
	= | "roboto-mono"
		| "jetbrains-mono"
		| "geist-mono"
		| "fira-code"
		| "cascadia-code"
		| "source-code-pro"
		| "inconsolata"
		| "courier-prime"

export type ContainerRuntime
	= | "docker"
		| "podman"
		| "nerdctl"
		| "buildah"
		| "skopeo"
		| "crictl"
		| "none"

export interface ThemeOption {
	value: Theme
	label: string
}

export interface FontOption {
	value: string
	label: string
	family: string
}

export interface RuntimeOption {
	value: ContainerRuntime
	label: string
	command: string
}

export const THEME_OPTIONS: ThemeOption[] = [
	{ value: "the-hub-dark", label: "The Hub Dark" },
	{ value: "the-hub-light", label: "The Hub Light" },
	{ value: "monokai", label: "Monokai" },
	{ value: "nord-dark", label: "Nord Dark" },
	{ value: "nord-light", label: "Nord Light" },
	{ value: "one-dark", label: "One Dark" },
	{ value: "tokyo-night", label: "Tokyo Night" },
	{ value: "cyberpunk", label: "Cyberpunk" },
	{ value: "github-dark", label: "GitHub Dark" },
	{ value: "github-light", label: "GitHub Light" },
	{ value: "catppuccin-mocha", label: "Catppuccin Mocha" },
	{ value: "catppuccin-latte", label: "Catppuccin Latte" },
]

export const FONT_SANS_OPTIONS: FontOption[] = [
	{ value: "roboto", label: "Roboto", family: "Roboto, sans-serif" },
	{ value: "inter", label: "Inter", family: "Inter, sans-serif" },
	{
		value: "instrument-sans",
		label: "Instrument Sans",
		family: "\"Instrument Sans\", system-ui, sans-serif",
	},
	{
		value: "jetbrains-sans",
		label: "JetBrains Sans",
		family: "\"JetBrains Sans\", sans-serif",
	},
	{
		value: "geist",
		label: "Geist",
		family: "\"Geist\", sans-serif",
	},
	{
		value: "nacelle",
		label: "Nacelle",
		family: "\"Nacelle\", sans-serif",
	},
	{
		value: "ibm-plex-sans",
		label: "IBM Plex Sans",
		family: "\"IBM Plex Sans\", sans-serif",
	},
	{
		value: "space-grotesk",
		label: "Space Grotesk",
		family: "\"Space Grotesk\", sans-serif",
	},
	{
		value: "dm-sans",
		label: "DM Sans",
		family: "\"DM Sans\", sans-serif",
	},
	{
		value: "onest",
		label: "Onest",
		family: "\"Onest\", sans-serif",
	},
]

export const FONT_MONO_OPTIONS: FontOption[] = [
	{
		value: "roboto-mono",
		label: "Roboto Mono",
		family: "\"Roboto Mono\", monospace",
	},
	{
		value: "jetbrains-mono",
		label: "JetBrains Mono",
		family: "\"JetBrains Mono\", monospace",
	},
	{
		value: "geist-mono",
		label: "Geist Mono",
		family: "\"Geist Mono\", monospace",
	},
	{
		value: "fira-code",
		label: "Fira Code",
		family: "\"Fira Code\", monospace",
	},
	{
		value: "cascadia-code",
		label: "Cascadia Code",
		family: "\"Cascadia Code\", monospace",
	},
	{
		value: "source-code-pro",
		label: "Source Code Pro",
		family: "\"Source Code Pro\", monospace",
	},
	{
		value: "inconsolata",
		label: "Inconsolata",
		family: "\"Inconsolata\", monospace",
	},
	{
		value: "courier-prime",
		label: "Courier Prime",
		family: "\"Courier Prime\", monospace",
	},
]

export const RUNTIME_OPTIONS: RuntimeOption[] = [
	{ value: "docker", label: "Docker", command: "docker pull" },
	{ value: "podman", label: "Podman", command: "podman pull" },
	{ value: "nerdctl", label: "Nerdctl", command: "nerdctl pull" },
	{ value: "buildah", label: "Buildah", command: "buildah pull" },
	{ value: "skopeo", label: "Skopeo", command: "skopeo copy docker://" },
	{ value: "crictl", label: "Crictl", command: "crictl pull" },
	{ value: "none", label: "None (image reference only)", command: "" },
]

function applyTheme(theme: Theme) {
	document.documentElement.setAttribute("data-theme", theme)
}

function applyFonts(sans: FontSans, mono: FontMono) {
	document.documentElement.setAttribute("data-font-sans", sans)
	document.documentElement.setAttribute("data-font-mono", mono)
}

function applyRuntime(runtime: ContainerRuntime) {
	document.documentElement.setAttribute("data-runtime", runtime)
}

export const useAppPreferencesStore = defineStore("appPreferences", () => {
	const isSettingsDialogOpen = ref(false)

	const theme = useLocalStorage<Theme>("containerhub-theme", "the-hub-light")
	const fontSans = useLocalStorage<FontSans>("containerhub-font-sans", "roboto")
	const fontMono = useLocalStorage<FontMono>(
		"containerhub-font-mono",
		"roboto-mono",
	)
	const containerRuntime = useLocalStorage<ContainerRuntime>(
		"containerhub-runtime",
		"docker",
	)

	applyTheme(theme.value)
	applyFonts(fontSans.value, fontMono.value)
	applyRuntime(containerRuntime.value)

	watch(theme, newTheme => applyTheme(newTheme))
	watch([fontSans, fontMono], ([newSans, newMono]) =>
		applyFonts(newSans, newMono))
	watch(containerRuntime, newRuntime => applyRuntime(newRuntime))

	const themeLabel = computed(() => {
		return THEME_OPTIONS.find(t => t.value === theme.value)?.label || theme.value
	})

	const fontSansLabel = computed(() => {
		return (
			FONT_SANS_OPTIONS.find(f => f.value === fontSans.value)?.label
			|| fontSans.value
		)
	})

	const fontMonoLabel = computed(() => {
		return (
			FONT_MONO_OPTIONS.find(f => f.value === fontMono.value)?.label
			|| fontMono.value
		)
	})

	const runtimeLabel = computed(() => {
		return (
			RUNTIME_OPTIONS.find(r => r.value === containerRuntime.value)?.label
			|| containerRuntime.value
		)
	})

	const runtimeCommand = computed(() => {
		const option = RUNTIME_OPTIONS.find(
			r => r.value === containerRuntime.value,
		)
		return option !== undefined ? option.command : "docker pull"
	})

	function openSettingsDialog() {
		isSettingsDialogOpen.value = true
	}

	function closeSettingsDialog() {
		isSettingsDialogOpen.value = false
	}

	function toggleSettingsDialog() {
		isSettingsDialogOpen.value = !isSettingsDialogOpen.value
	}

	function setTheme(newTheme: Theme) {
		theme.value = newTheme
	}

	function getThemeLabel(themeValue: Theme): string {
		return THEME_OPTIONS.find(t => t.value === themeValue)?.label || themeValue
	}

	function setFontSans(font: FontSans) {
		fontSans.value = font
	}

	function setFontMono(font: FontMono) {
		fontMono.value = font
	}

	function getFontSansLabel(font: FontSans): string {
		return FONT_SANS_OPTIONS.find(f => f.value === font)?.label || font
	}

	function getFontMonoLabel(font: FontMono): string {
		return FONT_MONO_OPTIONS.find(f => f.value === font)?.label || font
	}

	function setContainerRuntime(runtime: ContainerRuntime) {
		containerRuntime.value = runtime
	}

	function getRuntimeLabel(runtime: ContainerRuntime): string {
		return RUNTIME_OPTIONS.find(r => r.value === runtime)?.label || runtime
	}

	function getRuntimeCommand(runtime: ContainerRuntime): string {
		const option = RUNTIME_OPTIONS.find(r => r.value === runtime)
		return option !== undefined ? option.command : "docker pull"
	}

	function getPullCommand(
		registry: string,
		repository: string,
		tag: string,
	): string {
		const command = runtimeCommand.value
		const imageRef = `${registry}/${repository}:${tag}`
		return command ? `${command} ${imageRef}` : imageRef
	}

	return {
		isSettingsDialogOpen,
		theme,
		fontSans,
		fontMono,
		containerRuntime,
		themeLabel,
		fontSansLabel,
		fontMonoLabel,
		runtimeLabel,
		runtimeCommand,
		openSettingsDialog,
		closeSettingsDialog,
		toggleSettingsDialog,
		setTheme,
		getThemeLabel,
		setFontSans,
		setFontMono,
		getFontSansLabel,
		getFontMonoLabel,
		setContainerRuntime,
		getRuntimeLabel,
		getRuntimeCommand,
		getPullCommand,
		themeOptions: THEME_OPTIONS,
		fontSansOptions: FONT_SANS_OPTIONS,
		fontMonoOptions: FONT_MONO_OPTIONS,
		runtimeOptions: RUNTIME_OPTIONS,
	}
})
