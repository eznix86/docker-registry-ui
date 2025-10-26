// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import type { Tag } from "~/types"
import { defineStore } from "pinia"
import { ref } from "vue"

export const useTagDeleteStore = defineStore("tagDelete", () => {
	const isOpen = ref(false)
	const selectedTag = ref<Tag | null>(null)

	function openDialog(tag: Tag) {
		selectedTag.value = tag
		isOpen.value = true
	}

	function closeDialog() {
		isOpen.value = false
		selectedTag.value = null
	}

	function confirmDelete() {
		// The actual delete logic would be handled by the component
		// This just manages the dialog state
		closeDialog()
	}

	return {
		isOpen,
		selectedTag,
		openDialog,
		closeDialog,
		confirmDelete,
	}
})
