// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { ref, watch } from "vue"

export type FontSans
	= | "roboto"
		| "inter"
		| "instrument-sans"
		| "jetbrains-sans"
		| "geist"

export type FontMono
	= | "roboto-mono"
		| "jetbrains-mono"
		| "geist-mono"
		| "fira-code"

export interface FontOption {
	value: string
	label: string
	family: string
}

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
]

const STORAGE_KEY_SANS = "containerhub-font-sans"
const STORAGE_KEY_MONO = "containerhub-font-mono"

// Apply fonts to document
function applyFonts(sans: FontSans, mono: FontMono) {
	document.documentElement.setAttribute("data-font-sans", sans)
	document.documentElement.setAttribute("data-font-mono", mono)
}

// Read from localStorage first
const savedFontSans = (localStorage.getItem(STORAGE_KEY_SANS) as FontSans) || "roboto"
const savedFontMono = (localStorage.getItem(STORAGE_KEY_MONO) as FontMono) || "roboto-mono"

// Global reactive font state
const currentFontSans = ref<FontSans>(savedFontSans)
const currentFontMono = ref<FontMono>(savedFontMono)

// Apply fonts immediately (before Vue renders)
applyFonts(savedFontSans, savedFontMono)

// Watch for font changes and persist to localStorage
watch(currentFontSans, (newFont) => {
	applyFonts(newFont, currentFontMono.value)
	localStorage.setItem(STORAGE_KEY_SANS, newFont)
})

watch(currentFontMono, (newFont) => {
	applyFonts(currentFontSans.value, newFont)
	localStorage.setItem(STORAGE_KEY_MONO, newFont)
})

export function useFonts() {
	const setFontSans = (font: FontSans) => {
		currentFontSans.value = font
	}

	const setFontMono = (font: FontMono) => {
		currentFontMono.value = font
	}

	const getFontSansLabel = (font: FontSans): string => {
		return FONT_SANS_OPTIONS.find(f => f.value === font)?.label || font
	}

	const getFontMonoLabel = (font: FontMono): string => {
		return FONT_MONO_OPTIONS.find(f => f.value === font)?.label || font
	}

	return {
		currentFontSans,
		currentFontMono,
		setFontSans,
		setFontMono,
		getFontSansLabel,
		getFontMonoLabel,
		fontSansOptions: FONT_SANS_OPTIONS,
		fontMonoOptions: FONT_MONO_OPTIONS,
	}
}
