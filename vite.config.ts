import type { ServerOptions } from "vite"
import fs from "node:fs"
import path from "node:path"
import inertia from "@inertiajs/vite"
import tailwindcss from "@tailwindcss/vite"
import vue from "@vitejs/plugin-vue"
import laravel from "laravel-vite-plugin"
import { visualizer } from "rollup-plugin-visualizer"
import { defineConfig } from "vite"
import sri from "vite-plugin-manifest-sri"

type httpsOptions = ServerOptions["https"]

process.env.APP_URL = process.env.APP_URL || "http://localhost:3000"

export default defineConfig({
	plugins: [
		laravel({
			input: ["resources/js/app.ts", "resources/css/app.css"],
			refresh: true,
		}),
		inertia(),
		vue(),
		tailwindcss(),
		sri(),
		...(process.env.FRONTEND_DEBUG === "1" ? [visualizer({ open: true })] : []),
	],
	publicDir: false,
	server: {
		host: "127.0.0.1",
		port: 5173,
		https: httpsConfig(),
	},

	resolve: {
		alias: {
			"~": path.resolve(__dirname, "resources/js"),
		},
	},
	build: {
		rollupOptions: {
			output: {
				manualChunks(id) {
					if (id.includes("node_modules/vue/") || id.includes("node_modules/@inertiajs/vue3") || id.includes("node_modules/pinia")) {
						return "vue-vendor"
					}
					if (id.includes("node_modules/@vueuse/core")) {
						return "vueuse"
					}
					if (id.includes("node_modules/@headlessui/vue") || id.includes("node_modules/@formkit/auto-animate")) {
						return "ui-vendor"
					}
					if (id.includes("node_modules/tailwind-merge") || id.includes("node_modules/tailwind-variants")) {
						return "tailwind-utils"
					}
				},
			},
		},
		minify: "esbuild",
		target: "esnext",
		cssMinify: true,
	},
})

function httpsConfig(): httpsOptions {
	const enableTLS = process.env.ENABLE_TLS === "true"
	const tlsCertFile = process.env.TLS_CERT_FILE || "certs/localhost.pem"
	const tlsKeyFile = process.env.TLS_KEY_FILE || "certs/localhost-key.pem"

	if (!enableTLS) {
		return
	}

	if (!fs.existsSync(tlsCertFile) || !fs.existsSync(tlsKeyFile)) {
		return
	}

	return {
		key: fs.readFileSync(tlsKeyFile),
		cert: fs.readFileSync(tlsCertFile),
	}
}
