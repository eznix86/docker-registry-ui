// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import antfu from "@antfu/eslint-config"

export default antfu(
	{
		vue: {
			a11y: true,
		},
		stylistic: {
			indent: "tab",
			quotes: "double",
		},
		ignores: ["build", "node_modules"],
		rules: {
			"vue/block-order": [
				"error",
				{
					order: ["template", "script", "style"],
				},
			],
			"vue-a11y/label-has-for": [
				"error",
				{
					required: {
						some: ["nesting", "id"],
					},
					allowChildren: true,
				},
			],
		},
		extends: ["plugin:perfectionist/recommended-natural"],
	},
	{
		files: ["vite.config.ts"],
		rules: {
			"node/prefer-global/process": "off",
		},
	},
)
