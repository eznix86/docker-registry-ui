// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import type { DefineComponent } from "vue"
import { autoAnimatePlugin } from "@formkit/auto-animate/vue"
import { createInertiaApp } from "@inertiajs/vue3"

import { resolvePageComponent } from "laravel-vite-plugin/inertia-helpers"
import { createPinia } from "pinia"
import { createApp, h } from "vue"
import { vRipple } from "~/directives/ripple"

import "../css/app.css"

createInertiaApp({
	title: () => "ContainerHub",
	resolve: name =>
		resolvePageComponent(
			`./Pages/${name}.vue`,
			import.meta.glob<DefineComponent>("./Pages/**/*.vue"),
		),
	setup({ el, App, props, plugin }) {
		const app = createApp({ render: () => h(App, props) })
		const pinia = createPinia()

		app.use(plugin)
		app.use(pinia)
		app.use(autoAnimatePlugin)
		app.directive("ripple", vRipple)

		app.mount(el)
	},
})
