// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useState,
} from "react";
import type { Tag } from "~/types";

interface DeleteTagsContextValue {
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

const DeleteTagsContext = createContext<DeleteTagsContextValue | undefined>(
	undefined,
);

export function DeleteTagsProvider({ children }: { children: ReactNode }) {
	const [isSelectDialogOpen, setIsSelectDialogOpen] = useState(false);
	const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
	const [selectedTag, setSelectedTag] = useState<Tag | null>(null);

	const openSelectDialog = useCallback(() => {
		setIsSelectDialogOpen(true);
	}, []);

	const closeSelectDialog = useCallback(() => {
		setIsSelectDialogOpen(false);
	}, []);

	const openConfirmDialog = useCallback((tag: Tag) => {
		setSelectedTag(tag);
		setIsConfirmDialogOpen(true);
	}, []);

	const closeConfirmDialog = useCallback(() => {
		setIsConfirmDialogOpen(false);
		setSelectedTag(null);
	}, []);

	return (
		<DeleteTagsContext.Provider
			value={{
				isSelectDialogOpen,
				openSelectDialog,
				closeSelectDialog,
				isConfirmDialogOpen,
				selectedTag,
				openConfirmDialog,
				closeConfirmDialog,
			}}
		>
			{children}
		</DeleteTagsContext.Provider>
	);
}

export function useDeleteTags() {
	const context = useContext(DeleteTagsContext);
	if (context === undefined) {
		throw new Error("useDeleteTags must be used within DeleteTagsProvider");
	}
	return context;
}
