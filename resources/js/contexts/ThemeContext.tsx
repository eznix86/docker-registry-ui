// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import type { Theme } from "@mui/material/styles";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import { type ThemeName, withTheme } from "~/themes";

interface ThemeContextValue {
	themeName: ThemeName;
	theme: Theme | null;
	setTheme: (themeName: ThemeName) => void;
	isSettingsOpen: boolean;
	openSettings: () => void;
	closeSettings: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = "containerhub-theme";
const DEFAULT_THEME: ThemeName = "the-hub-dark";

export function ThemeContextProvider({ children }: { children: ReactNode }) {
	const [themeName, setThemeName] = useState<ThemeName>(() => {
		const stored = localStorage.getItem(THEME_STORAGE_KEY);
		return (stored as ThemeName) || DEFAULT_THEME;
	});
	const [theme, setThemeInstance] = useState<Theme | null>(null);
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);

	useEffect(() => {
		withTheme(themeName).then(setThemeInstance);
	}, [themeName]);

	const setTheme = useCallback((newThemeName: ThemeName) => {
		setThemeName(newThemeName);
		localStorage.setItem(THEME_STORAGE_KEY, newThemeName);
	}, []);

	const openSettings = useCallback(() => setIsSettingsOpen(true), []);
	const closeSettings = useCallback(() => setIsSettingsOpen(false), []);

	return (
		<ThemeContext.Provider
			value={{
				themeName,
				theme,
				setTheme,
				isSettingsOpen,
				openSettings,
				closeSettings,
			}}
		>
			{children}
		</ThemeContext.Provider>
	);
}

export function useTheme() {
	const context = useContext(ThemeContext);
	if (!context) {
		throw new Error("useTheme must be used within ThemeContextProvider");
	}
	return context;
}
