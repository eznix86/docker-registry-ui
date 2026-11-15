import tsParser from "@typescript-eslint/parser"
import vue from "eslint-plugin-vue"
import vueA11y from "eslint-plugin-vuejs-accessibility"

export default [
	...vue.configs["flat/essential"],
	...vueA11y.configs["flat/recommended"],
	{
		files: ["**/*.vue"],
		languageOptions: {
			parserOptions: {
				parser: tsParser,
			},
		},
		rules: {
			"vue/multi-word-component-names": "off",
			"vue/block-order": [
				"error",
				{
					order: ["template", "script", "style"],
				},
			],
			"vuejs-accessibility/label-has-for": [
				"error",
				{
					required: {
						some: ["nesting", "id"],
					},
					allowChildren: true,
				},
			],
		},
	},
	{
		ignores: ["**/*", "!resources/", "!resources/**/", "!resources/**/*.vue"],
	},
]
