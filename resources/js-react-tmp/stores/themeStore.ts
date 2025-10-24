// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import type { Theme } from "@mui/material/styles"
import type { ThemeName } from "~/themes"
import { create } from "zustand"
import { withTheme } from "~/themes"

const THEME_STORAGE_KEY = "containerhub-theme"
const DEFAULT_THEME: ThemeName = "the-hub-dark"

interface ThemeState {
	themeName: ThemeName
	theme: Theme | null
	isSettingsOpen: boolean
	setTheme: (themeName: ThemeName) => void
	openSettings: () => void
	closeSettings: () => void
}

export const useThemeStore = create<ThemeState>(set => ({
	themeName:
		(localStorage.getItem(THEME_STORAGE_KEY) as ThemeName) || DEFAULT_THEME,
	theme: null,
	isSettingsOpen: false,

	setTheme: (newThemeName) => {
		localStorage.setItem(THEME_STORAGE_KEY, newThemeName)
		set({ themeName: newThemeName })
		withTheme(newThemeName).then((theme) => {
			set({ theme })
		})
	},

	openSettings: () => set({ isSettingsOpen: true }),

	closeSettings: () => set({ isSettingsOpen: false }),
}))

// Selector hooks
export const useTheme = () => useThemeStore(state => state.theme)
export const useThemeName = () => useThemeStore(state => state.themeName)
export function useIsSettingsOpen() {
	return useThemeStore(state => state.isSettingsOpen)
}
export const useSetTheme = () => useThemeStore(state => state.setTheme)
export function useOpenSettings() {
	return useThemeStore(state => state.openSettings)
}
export function useCloseSettings() {
	return useThemeStore(state => state.closeSettings)
}

const initialTheme
	= (localStorage.getItem(THEME_STORAGE_KEY) as ThemeName) || DEFAULT_THEME
withTheme(initialTheme).then((theme) => {
	useThemeStore.setState({ theme })
})
