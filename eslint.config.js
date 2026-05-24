import antfu from "@antfu/eslint-config"

export default antfu(
	{
		prettier: true,
		vue: {
			a11y: true,
		},
		stylistic: {
			indent: "tab",
			quotes: "double",
		},
		ignores: ["build", "node_modules", "charts", ".github", "public"],
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
