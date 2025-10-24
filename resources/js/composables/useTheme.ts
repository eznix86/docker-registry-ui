// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { ref, watch } from "vue"

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

export interface ThemeOption {
	value: Theme
	label: string
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

const STORAGE_KEY = "containerhub-theme"

// Apply theme to document
function applyTheme(theme: Theme) {
	document.documentElement.setAttribute("data-theme", theme)
}

// Read from localStorage first
const savedTheme = (localStorage.getItem(STORAGE_KEY) as Theme) || "the-hub-light"

// Global reactive theme state
const currentTheme = ref<Theme>(savedTheme)

// Apply theme immediately (before Vue renders)
applyTheme(savedTheme)

// Watch for theme changes and persist to localStorage
watch(currentTheme, (newTheme) => {
	applyTheme(newTheme)
	localStorage.setItem(STORAGE_KEY, newTheme)
})

export function useTheme() {
	const setTheme = (theme: Theme) => {
		currentTheme.value = theme
	}

	const getThemeLabel = (theme: Theme): string => {
		return THEME_OPTIONS.find(t => t.value === theme)?.label || theme
	}

	return {
		currentTheme,
		setTheme,
		getThemeLabel,
		themeOptions: THEME_OPTIONS,
	}
}
