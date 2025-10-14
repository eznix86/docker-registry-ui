// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import react from "@vitejs/plugin-react";
import laravel from "laravel-vite-plugin";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [
		laravel({
			input: ["resources/js/app.tsx"],
			refresh: true,
		}),
		react(),
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
			// treeshake: {
			// 	moduleSideEffects: false,
			// 	propertyReadSideEffects: false,
			// },
		},
	},
	// optimizeDeps: {
	// 	include: ["react", "react-dom", "react-router-dom"],
	// 	exclude: ["@mui/icons-material"],
	// },
});
