// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { createInertiaApp } from "@inertiajs/react";
import { CssBaseline } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { resolvePageComponent } from "laravel-vite-plugin/inertia-helpers";
import { createRoot } from "react-dom/client";
import Layout from "~/components/Layout";
import SettingsDialog from "~/components/SettingsDialog";
import { SearchProvider } from "~/contexts/SearchContext";
import { ThemeContextProvider, useTheme } from "~/contexts/ThemeContext";

interface AppContentProps {
	// biome-ignore lint: Inertia app type
	App: any;
	// biome-ignore lint: Inertia props type
	props: any;
}

function AppContent({ App, props }: AppContentProps) {
	const { theme } = useTheme();

	if (!theme) return null;

	return (
		<ThemeProvider theme={theme}>
			<CssBaseline />
			<SearchProvider>
				<Layout
					onRefresh={() => {
						console.log("Refreshing repositories...");
					}}
				>
					<App {...props} />
				</Layout>
				<SettingsDialog />
			</SearchProvider>
		</ThemeProvider>
	);
}

createInertiaApp({
	title: () => `ContainerHub`,
	resolve: (name) =>
		resolvePageComponent(
			`./Pages/${name}.tsx`,
			import.meta.glob("./Pages/**/*.tsx"),
		),
	setup({ el, App, props }) {
		const root = createRoot(el);
		root.render(
			<ThemeContextProvider>
				<AppContent App={App} props={props} />
			</ThemeContextProvider>,
		);
	},
});
