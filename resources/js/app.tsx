// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { createInertiaApp } from "@inertiajs/react";
import { CssBaseline } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { resolvePageComponent } from "laravel-vite-plugin/inertia-helpers";
import { createRoot } from "react-dom/client";
import Layout from "~/components/Layout";
import { BaseTheme } from "./themes/the-hub-dark";

createInertiaApp({
	title: () => `ContainerHub`,
	resolve: (name) =>
		resolvePageComponent(
			`./pages/${name}.tsx`,
			import.meta.glob("./pages/**/*.tsx"),
		),
	setup({ el, App, props }) {
		const root = createRoot(el);
		root.render(
			<ThemeProvider theme={BaseTheme}>
				<CssBaseline />
				<Layout
					onRefresh={() => {
						console.log("Refreshing repositories...");
					}}
				>
					<App {...props} />
				</Layout>
			</ThemeProvider>,
		);
	},
});
