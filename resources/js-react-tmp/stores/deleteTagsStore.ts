// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import type { Tag } from "~/types"
import { dequal } from "dequal"
import { create } from "zustand"

interface DeleteTagsState {
	// Select dialog state (bulk delete from header button)
	isSelectDialogOpen: boolean
	openSelectDialog: () => void
	closeSelectDialog: () => void

	// Confirm dialog state (single tag delete)
	isConfirmDialogOpen: boolean
	selectedTag: Tag | null
	openConfirmDialog: (tag: Tag) => void
	closeConfirmDialog: () => void
}

export const useDeleteTagsStore = create<DeleteTagsState>(set => ({
	isSelectDialogOpen: false,
	isConfirmDialogOpen: false,
	selectedTag: null,

	openSelectDialog: () =>
		set({
			isSelectDialogOpen: true,
		}),

	closeSelectDialog: () =>
		set({
			isSelectDialogOpen: false,
		}),

	openConfirmDialog: tag =>
		set((state) => {
			if (dequal(state.selectedTag, tag)) {
				return { isConfirmDialogOpen: true }
			}
			return {
				selectedTag: tag,
				isConfirmDialogOpen: true,
			}
		}),

	closeConfirmDialog: () =>
		set({
			isConfirmDialogOpen: false,
			selectedTag: null,
		}),
}))

// Selector hooks
export function useIsSelectDialogOpen() {
	return useDeleteTagsStore(state => state.isSelectDialogOpen)
}
export function useOpenSelectDialog() {
	return useDeleteTagsStore(state => state.openSelectDialog)
}
export function useCloseSelectDialog() {
	return useDeleteTagsStore(state => state.closeSelectDialog)
}

export function useIsConfirmDialogOpen() {
	return useDeleteTagsStore(state => state.isConfirmDialogOpen)
}
export function useSelectedTag() {
	return useDeleteTagsStore(state => state.selectedTag)
}
export function useOpenConfirmDialog() {
	return useDeleteTagsStore(state => state.openConfirmDialog)
}
export function useCloseConfirmDialog() {
	return useDeleteTagsStore(state => state.closeConfirmDialog)
}
