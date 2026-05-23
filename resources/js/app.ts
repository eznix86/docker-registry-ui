
import type { DefineComponent } from "vue"
import { autoAnimatePlugin } from "@formkit/auto-animate/vue"
import { createInertiaApp } from "@inertiajs/vue3"
import { resolvePageComponent } from "laravel-vite-plugin/inertia-helpers"

import { createPinia } from "pinia"
import { createApp, h } from "vue"
import { vRipple } from "~/directives/ripple"
import { useSyncProgressStore } from "~/stores/useSyncProgressStore"

declare global {
	interface Window {
		__CSP_NONCE__?: string
	}
}

createInertiaApp({
	title: () => "ContainerHub",
	defaults: {
		prefetch: {
			cacheFor: "10s",
		},
	},
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

		// Initialize WebSocket connection globally
		const syncStore = useSyncProgressStore()
		syncStore.connect()

		contentSecurityPolicy()
	},
})

function contentSecurityPolicy() {
	const nonce = window.__CSP_NONCE__
	if (!nonce) {
		return
	}

	document.querySelectorAll("style").forEach((el) => {
		if (!el.hasAttribute("nonce"))
			el.setAttribute("nonce", nonce)
	})

	const observer = new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			for (const node of mutation.addedNodes) {
				if (node instanceof HTMLStyleElement && !node.hasAttribute("nonce")) {
					node.setAttribute("nonce", nonce)
				}
			}
		}
	})

	observer.observe(document.head, { childList: true })
}
