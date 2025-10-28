// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025  Bruno Bernard
//
// This file is part of Docker Registry UI (Container Hub).
//
// Docker Registry UI is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
//
// Docker Registry UI is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.

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
