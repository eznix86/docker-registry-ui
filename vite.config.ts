// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import laravel from "laravel-vite-plugin";
import { defineConfig } from "vite";
import { visualizer } from 'rollup-plugin-visualizer';
import preact from "@preact/preset-vite";

export default defineConfig({
	plugins: [
		laravel({
			input: ["resources/js/app.tsx"],
			refresh: true,
		}),
		preact(),
		visualizer({ open: true })

	],
	server: {
		host: "127.0.0.1",
		port: 5173,
	},
	resolve: {
		alias: {
			"~": "/resources/js",
		},
	},
	build: {
		rollupOptions: {
			output: {
				manualChunks: {
					"react-vendor": ["react", "react-dom"],
					"ui-vendor": ["@mui/material", "@mui/icons-material"],
				},
			},
			treeshake: true,
		},
	}
});
