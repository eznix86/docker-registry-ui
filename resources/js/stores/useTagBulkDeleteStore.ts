// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { defineStore } from "pinia"
import { ref } from "vue"

export const useTagBulkDeleteStore = defineStore("tagBulkDelete", () => {
	const isOpen = ref(false)
	const selectedTags = ref<string[]>([])
	const selectAll = ref(false)

	function openDialog() {
		selectedTags.value = []
		selectAll.value = false
		isOpen.value = true
	}

	function closeDialog() {
		isOpen.value = false
		selectedTags.value = []
		selectAll.value = false
	}

	function confirmDelete() {
		// The actual delete logic would be handled by the component
		// This just manages the dialog state
		closeDialog()
	}

	return {
		isOpen,
		selectedTags,
		selectAll,
		openDialog,
		closeDialog,
		confirmDelete,
	}
})
