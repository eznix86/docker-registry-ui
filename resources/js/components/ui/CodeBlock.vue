<template>
	<pre class="code-block customYAML"><code v-html="rendered" /></pre>
</template>

<script setup lang="ts">
import hljs from "highlight.js/lib/core"
import yaml from "highlight.js/lib/languages/yaml"
import { computed } from "vue"

const props = withDefaults(defineProps<{
	code: string
	language?: string
	showLineNumbers?: boolean
}>(), {
	language: "yaml",
	showLineNumbers: true,
})

hljs.registerLanguage("yaml", yaml)

const builtInObjects = [".Release", ".Chart", ".Files", ".Capabilities", ".Template"]
const flowControls = new Set([
	"if",
	"else",
	"with",
	"range",
	"define",
	"template",
	"block",
	"include",
	"required",
	"end",
	"toYaml",
	"tpl",
])
const templateFunctions = new Set([
	"abbrev",
	"abbrevboth",
	"add",
	"add1",
	"adler32sum",
	"ago",
	"and",
	"append",
	"atoi",
	"b32dec",
	"b32enc",
	"b64dec",
	"b64enc",
	"base",
	"camelcase",
	"cat",
	"ceil",
	"clean",
	"coalesce",
	"compact",
	"concat",
	"contains",
	"date",
	"dateInZone",
	"dateModify",
	"deepCopy",
	"deepEqual",
	"default",
	"dict",
	"dir",
	"div",
	"duration",
	"empty",
	"eq",
	"fail",
	"first",
	"get",
	"gt",
	"has",
	"hasKey",
	"indent",
	"kindIs",
	"kindOf",
	"last",
	"len",
	"lookup",
	"merge",
	"nindent",
	"not",
	"or",
	"printf",
	"quote",
	"repeat",
	"replace",
	"semver",
	"semverCompare",
	"toJson",
	"toString",
	"trim",
	"trunc",
	"upper",
	"urlJoin",
])

const highlighted = computed(() => {
	if (!props.code)
		return ""
	return hljs.highlight(props.code, { language: props.language, ignoreIllegals: true }).value
})

const rendered = computed(() => {
	if (!props.showLineNumbers)
		return wrapHelmTemplateExpressions(highlighted.value)
	return highlighted.value
		.split("\n")
		.map((line, i) => `<span class="line" data-line-number="${i + 1}">${wrapHelmTemplateExpressions(line) || "&nbsp;"}</span>`)
		.join("")
})

function wrapHelmTemplateExpressions(line: string) {
	return line.replace(/(\{\{.*?\}\})/g, (expression) => {
		return `<span class="hljs-template-expression">${highlightHelmTemplateExpression(expression)}</span>`
	})
}

function highlightHelmTemplateExpression(expression: string) {
	let previousToken = ""

	return expression
		.replace(/<\/?span[^>]*>/g, "")
		.replace(/\{\{-?|-?\}\}|&quot;.*?&quot;|'[^']*'|\s+|\S+/g, (token) => {
			if (/^\s+$/.test(token)) {
				return token
			}

			const rendered = renderHelmTemplateToken(token, previousToken)
			previousToken = token
			return rendered
		})
}

function renderHelmTemplateToken(token: string, previousToken: string): string {
	if (token === "{{" || token === "{{-" || token === "}}" || token === "-}}" || token === "|" || token === ")" || token === "(") {
		return wrapToken("hljs-template-delimiter", token)
	}
	if (token.startsWith("(") && token.length > 1) {
		return `${wrapToken("hljs-template-delimiter", "(")}${renderHelmTemplateToken(token.slice(1), previousToken)}`
	}
	if (token.endsWith(")") && token.length > 1) {
		return `${renderHelmTemplateToken(token.slice(0, -1), previousToken)}${wrapToken("hljs-template-delimiter", ")")}`
	}

	if (token.startsWith("&quot;")) {
		if (previousToken === "include" || previousToken === "template") {
			return wrapToken("hljs-template-defined", token)
		}
		return token
	}

	if (token.startsWith(".Values")) {
		return wrapToken("hljs-template-value", token)
	}

	if (token.startsWith("$")) {
		return wrapToken("hljs-template-variable", token)
	}

	if (flowControls.has(token)) {
		return wrapToken("hljs-template-flow", token)
	}

	if (templateFunctions.has(token)) {
		return wrapToken("hljs-template-function", token)
	}

	if (builtInObjects.some(builtIn => token.startsWith(builtIn) && token !== ".Capabilities.APIVersions.Has")) {
		return wrapToken("hljs-template-built-in", token)
	}

	return token
}

function wrapToken(className: string, token: string) {
	return `<span class="${className}">${token}</span>`
}
</script>

<style scoped>
.code-block {
	padding: 1.5rem;
	padding-left: 4.5rem;
	margin: 0;
	font-family: var(--font-mono);
	font-size: 80%;
	line-height: 1.5rem;
	color: var(--color-foreground);
	background: transparent;
	white-space: pre;
	overflow: visible;
}

.code-block :deep(code) {
	background: transparent;
	padding: 0;
	font: inherit;
	color: inherit;
}
</style>
