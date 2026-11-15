<template>
	<div class="min-h-screen bg-background text-foreground">
		<slot />
		<VersionFooter :shared="sharedProps" />
	</div>
</template>

<script setup lang="ts">
import { usePage } from "@inertiajs/vue3"
import { computed } from "vue"

import VersionFooter from "~/components/VersionFooter.vue"
import type { SharedProps } from "~/types"

const page = usePage<{ props: SharedProps }>()
const sharedProps = computed<SharedProps>(() => ({
	appVersion: typeof page.props.appVersion === "string" ? page.props.appVersion : "dev",
	disableTagDeletion: Boolean(page.props.disableTagDeletion),
}))
</script>
