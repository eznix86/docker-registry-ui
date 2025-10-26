// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import type { Repository } from "~/types"
import { defineStore } from "pinia"
import { ref } from "vue"

export const useUntaggedDialogStore = defineStore("untaggedDialog", () => {
	const isOpen = ref(false)
	const selectedRepository = ref<Repository | null>(null)

	function openDialog(repository: Repository) {
		selectedRepository.value = repository
		isOpen.value = true
	}

	function closeDialog() {
		isOpen.value = false
		selectedRepository.value = null
	}

	return {
		isOpen,
		selectedRepository,
		openDialog,
		closeDialog,
	}
})
