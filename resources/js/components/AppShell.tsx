// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { CssBaseline } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import Layout from "~/components/Layout";
import SettingsDialog from "~/components/SettingsDialog";
import { useTheme } from "~/stores/themeStore";

interface AppShellProps {
	// biome-ignore lint: Inertia app type
	App: any;
	// biome-ignore lint: Inertia props type
	props: any;
}

export default function AppShell({ App, props }: AppShellProps) {
	const theme = useTheme();

	if (!theme) return null;

	return (
		<ThemeProvider theme={theme}>
			<CssBaseline />
			<Layout
				onRefresh={() => {
					console.log("Refreshing repositories...");
				}}
			>
				<App {...props} />
			</Layout>
			<SettingsDialog />
		</ThemeProvider>
	);
}
