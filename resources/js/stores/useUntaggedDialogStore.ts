// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import type { Repository } from "~/types"
import { defineStore } from "pinia"
import { ref } from "vue"

export const useUntaggedDialogStore = defineStore("untaggedDialog", () => {
	// ========== STATE ==========

	const isOpen = ref(false)
	const selectedRepository = ref<Repository | null>(null)

	// ========== ACTIONS ==========

	function openDialog(repository: Repository) {
		selectedRepository.value = repository
		isOpen.value = true
	}

	function closeDialog() {
		isOpen.value = false
		selectedRepository.value = null
	}

	return {
		// State
		isOpen,
		selectedRepository,

		// Actions
		openDialog,
		closeDialog,
	}
})
