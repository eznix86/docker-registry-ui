// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025  Bruno Bernard
//
// This file is part of Docker Registry UI (Container Hub).
//
// Docker Registry UI is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
//
// Docker Registry UI is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.

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
