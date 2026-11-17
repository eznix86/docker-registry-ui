<template>
	<!-- eslint-disable-next-line vue/no-v-html -->
	<div class="prose prose-sm max-w-none p-4 sm:p-6" v-html="html" />
</template>

<script setup lang="ts">
import MarkdownIt from "markdown-it"
import { computed } from "vue"

const props = defineProps<{ source: string }>()

const md = new MarkdownIt({ html: false, linkify: true })
const renderToken = md.renderer.renderToken.bind(md.renderer)
md.renderer.rules.link_open = (tokens, idx, options) => {
	tokens[idx]?.attrSet("target", "_blank")
	tokens[idx]?.attrSet("rel", "noopener noreferrer")
	return renderToken(tokens, idx, options)
}

const html = computed(() => md.render(props.source))
</script>
