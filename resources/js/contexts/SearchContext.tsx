// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { createContext, type ReactNode, useContext, useState } from "react";

interface SearchContextValue {
	searchValue: string;
	setSearchValue: (value: string) => void;
	onSearchChange?: (value: string) => void;
	setOnSearchChange: (handler: (value: string) => void) => void;
}

const SearchContext = createContext<SearchContextValue | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
	const [searchValue, setSearchValue] = useState("");
	const [onSearchChange, setOnSearchChange] = useState<
		((value: string) => void) | undefined
	>();

	return (
		<SearchContext.Provider
			value={{ searchValue, setSearchValue, onSearchChange, setOnSearchChange }}
		>
			{children}
		</SearchContext.Provider>
	);
}

export function useSearch() {
	const context = useContext(SearchContext);
	if (context === undefined) {
		throw new Error("useSearch must be used within SearchProvider");
	}
	return context;
}
