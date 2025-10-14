// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useState,
} from "react";

interface UntagDialogContextValue {
	isOpen: boolean;
	repositoryName: string | null;
	openDialog: (repositoryName: string) => void;
	closeDialog: () => void;
}

const UntagDialogContext = createContext<UntagDialogContextValue | undefined>(
	undefined,
);

export function UntagDialogProvider({ children }: { children: ReactNode }) {
	const [isOpen, setIsOpen] = useState(false);
	const [repositoryName, setRepositoryName] = useState<string | null>(null);

	const openDialog = useCallback((name: string) => {
		setRepositoryName(name);
		setIsOpen(true);
	}, []);

	const closeDialog = useCallback(() => {
		setIsOpen(false);
		setRepositoryName(null);
	}, []);

	return (
		<UntagDialogContext.Provider
			value={{ isOpen, repositoryName, openDialog, closeDialog }}
		>
			{children}
		</UntagDialogContext.Provider>
	);
}

export function useUntagDialog() {
	const context = useContext(UntagDialogContext);
	if (context === undefined) {
		throw new Error("useUntagDialog must be used within UntagDialogProvider");
	}
	return context;
}
