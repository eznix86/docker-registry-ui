// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { dequal } from "dequal";
import { create } from "zustand";
import type { Tag } from "~/types";

interface DeleteTagsState {
	// Select dialog state (bulk delete from header button)
	isSelectDialogOpen: boolean;
	openSelectDialog: () => void;
	closeSelectDialog: () => void;

	// Confirm dialog state (single tag delete)
	isConfirmDialogOpen: boolean;
	selectedTag: Tag | null;
	openConfirmDialog: (tag: Tag) => void;
	closeConfirmDialog: () => void;
}

export const useDeleteTagsStore = create<DeleteTagsState>((set) => ({
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

	openConfirmDialog: (tag) =>
		set((state) => {
			if (dequal(state.selectedTag, tag)) {
				return { isConfirmDialogOpen: true };
			}
			return {
				selectedTag: tag,
				isConfirmDialogOpen: true,
			};
		}),

	closeConfirmDialog: () =>
		set({
			isConfirmDialogOpen: false,
			selectedTag: null,
		}),
}));

// Selector hooks
export const useIsSelectDialogOpen = () =>
	useDeleteTagsStore((state) => state.isSelectDialogOpen);
export const useOpenSelectDialog = () =>
	useDeleteTagsStore((state) => state.openSelectDialog);
export const useCloseSelectDialog = () =>
	useDeleteTagsStore((state) => state.closeSelectDialog);

export const useIsConfirmDialogOpen = () =>
	useDeleteTagsStore((state) => state.isConfirmDialogOpen);
export const useSelectedTag = () =>
	useDeleteTagsStore((state) => state.selectedTag);
export const useOpenConfirmDialog = () =>
	useDeleteTagsStore((state) => state.openConfirmDialog);
export const useCloseConfirmDialog = () =>
	useDeleteTagsStore((state) => state.closeConfirmDialog);
