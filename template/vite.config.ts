// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import vue from "@vitejs/plugin-vue"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
	plugins: [vue(), tailwindcss()],
	resolve: {
		alias: {
			"~": path.resolve(__dirname, "./src"),
		},
	},
})
