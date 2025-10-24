// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import type { Theme } from "@mui/material/styles"
import type { ThemeName } from "~/themes/types"

export type { Colors, ThemeName } from "~/themes/types"

const themeFactories: Record<ThemeName, () => Promise<Theme>> = {
	"the-hub-dark": () =>
		import("~/themes/the-hub-dark").then(m => m.BaseTheme),
	"the-hub-light": () =>
		import("~/themes/the-hub-light").then(m => m.BaseTheme),
	"monokai": () => import("~/themes/monokai").then(m => m.BaseTheme),
	"nord-dark": () => import("~/themes/nord-dark").then(m => m.BaseTheme),
	"nord-light": () => import("~/themes/nord-light").then(m => m.BaseTheme),
	"one-dark": () => import("~/themes/one-dark").then(m => m.BaseTheme),
	"tokyo-night": () => import("~/themes/tokyo-night").then(m => m.BaseTheme),
	"cyberpunk": () => import("~/themes/cyberpunk").then(m => m.BaseTheme),
	"github-dark": () => import("~/themes/github-dark").then(m => m.BaseTheme),
	"github-light": () =>
		import("~/themes/github-light").then(m => m.BaseTheme),
	"catppuccin-mocha": () =>
		import("~/themes/catppuccin-mocha").then(m => m.BaseTheme),
	"catppuccin-latte": () =>
		import("~/themes/catppuccin-latte").then(m => m.BaseTheme),
}

const themeCache = new Map<ThemeName, Theme>()

export async function withTheme(themeName: ThemeName): Promise<Theme> {
	const cachedTheme = themeCache.get(themeName)
	if (cachedTheme) {
		return cachedTheme
	}

	// Fallback to default theme if the theme name is invalid
	const themeFactory = themeFactories[themeName]
	if (!themeFactory) {
		console.warn(
			`Theme "${themeName}" not found, falling back to "the-hub-dark"`,
		)
		return withTheme("the-hub-dark")
	}

	const theme = await themeFactory()
	themeCache.set(themeName, theme)
	return theme
}
