// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { createInertiaApp } from "@inertiajs/react";
import { resolvePageComponent } from "laravel-vite-plugin/inertia-helpers";
import { createRoot } from "react-dom/client";
import { ThemeContextProvider } from "~/contexts/ThemeContext";
import AppShell from "./components/AppShell";

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
				<AppShell App={App} props={props} />
			</ThemeContextProvider>,
		);
	},
});
