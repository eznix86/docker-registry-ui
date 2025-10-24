// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { defineStore } from "pinia"
import { ref } from "vue"

export const useSettingsStore = defineStore("settings", () => {
	// State
	const isOpen = ref(false)
	const selectedTheme = ref("system")

	// Actions
	function openDialog() {
		isOpen.value = true
	}

	function closeDialog() {
		isOpen.value = false
	}

	function toggleDialog() {
		isOpen.value = !isOpen.value
	}

	function setTheme(theme: string) {
		selectedTheme.value = theme
	}

	return {
		// State
		isOpen,
		selectedTheme,
		// Actions
		openDialog,
		closeDialog,
		toggleDialog,
		setTheme,
	}
})
