// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import fs from "node:fs";
import preact from "@preact/preset-vite";
import laravel from "laravel-vite-plugin";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig, type ServerOptions } from "vite";

type httpsOptions = ServerOptions["https"];

export default defineConfig({
	plugins: [
		laravel({
			input: ["resources/js/app.tsx"],
			refresh: true,
		}),
		preact(),
		visualizer({ open: true }),
	],
	server: {
		host: "127.0.0.1",
		port: 5173,
		https: httpsConfig(),
	},

	resolve: {
		alias: {
			"~": "/resources/js",
		},
	},
	build: {
		rollupOptions: {
			treeshake: {
				preset: "recommended",
				propertyReadSideEffects: false,
				moduleSideEffects: false,
			},
		},
		minify: "esbuild",
		target: "esnext",
		cssMinify: true,
	},
});

function httpsConfig(): httpsOptions {
	const enableTLS = process.env.ENABLE_TLS === "true";
	const tlsCertFile = process.env.TLS_CERT_FILE || "certs/localhost.pem";
	const tlsKeyFile = process.env.TLS_KEY_FILE || "certs/localhost-key.pem";

	if (!enableTLS) {
		return;
	}

	if (!fs.existsSync(tlsCertFile) || !fs.existsSync(tlsKeyFile)) {
		return;
	}

	return {
		key: fs.readFileSync(tlsKeyFile),
		cert: fs.readFileSync(tlsCertFile),
	};
}
