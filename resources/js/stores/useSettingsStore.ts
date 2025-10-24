// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { defineStore } from "pinia"
import { ref } from "vue"

export const useSettingsStore = defineStore("settings", () => {
	// State - only manage dialog open/close state
	// Theme and font settings are managed by composables (useTheme, useFonts)
	const dialogOpen = ref(false)

	// Actions
	function openSettings() {
		dialogOpen.value = true
	}

	function closeSettings() {
		dialogOpen.value = false
	}

	return {
		// State
		dialogOpen,
		// Actions
		openSettings,
		closeSettings,
	}
})
