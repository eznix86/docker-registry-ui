import type { ServerOptions } from "vite"
import fs from "node:fs"
import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import vue from "@vitejs/plugin-vue"
import laravel from "laravel-vite-plugin"
import { visualizer } from "rollup-plugin-visualizer"
import { defineConfig } from "vite"
import sri from "vite-plugin-manifest-sri"

type httpsOptions = ServerOptions["https"]

export default defineConfig({
	plugins: [
		laravel({
			input: ["resources/js/app.ts", "resources/css/app.css"],
			refresh: true,
		}),
		vue(),
		tailwindcss(),
		sri(),
		visualizer({ open: true }),
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
			treeshake: {
				preset: "recommended",
				propertyReadSideEffects: false,
				moduleSideEffects: false,
			},
			output: {
				manualChunks: {
					"vue-vendor": ["vue", "@inertiajs/vue3", "pinia"],
					"vueuse": ["@vueuse/core"],
					"ui-vendor": ["@headlessui/vue", "@formkit/auto-animate"],
					"tailwind-utils": ["tailwind-merge", "tailwind-variants"],
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
