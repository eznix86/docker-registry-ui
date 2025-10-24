// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { createInertiaApp } from "@inertiajs/react"
import { resolvePageComponent } from "laravel-vite-plugin/inertia-helpers"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import AppShell from "~/components/AppShell"
import { setupInertiaListeners } from "~/setup/setupInertiaListeners"

// Set up Inertia event listeners
setupInertiaListeners()

createInertiaApp({
	title: () => `ContainerHub`,
	resolve: name =>
		resolvePageComponent(
			`./Pages/${name}.tsx`,
			import.meta.glob("./Pages/**/*.tsx", { eager: false }),
		),
	setup({ el, App, props }) {
		const root = createRoot(el)
		root.render(
			<StrictMode>
				<AppShell App={App} props={props} />
			</StrictMode>,
		)
	},
})
