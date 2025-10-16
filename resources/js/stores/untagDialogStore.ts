// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { create } from "zustand";

interface UntagDialogState {
	isOpen: boolean;
	repositoryName: string | null;
	openDialog: (repositoryName: string) => void;
	closeDialog: () => void;
}

export const useUntagDialogStore = create<UntagDialogState>((set) => ({
	isOpen: false,
	repositoryName: null,

	openDialog: (repositoryName) =>
		set({
			repositoryName,
			isOpen: true,
		}),

	closeDialog: () =>
		set({
			isOpen: false,
			repositoryName: null,
		}),
}));

// Selector hooks
export const useUntagDialogIsOpen = () =>
	useUntagDialogStore((state) => state.isOpen);
export const useUntagDialogRepositoryName = () =>
	useUntagDialogStore((state) => state.repositoryName);
export const useOpenUntagDialog = () =>
	useUntagDialogStore((state) => state.openDialog);
export const useCloseUntagDialog = () =>
	useUntagDialogStore((state) => state.closeDialog);
