


<template>
	<nav class="mb-4 sm:mb-6">
		<ol
			class="flex flex-wrap items-center gap-2 text-xs sm:text-sm md:text-base text-muted-foreground"
		>
			<li>
				<Link
					href="/"
					class="text-primary hover:underline"
					:prefetch="['hover']"
				>
					Explore
				</Link>
			</li>
			<li>/</li>
			<li>
				<Link
					:href="registryHref"
					class="opacity-60 hover:underline decoration-dotted"
					:prefetch="['hover']"
				>
					{{ registryHost }}
				</Link>
			</li>
			<li>/</li>
			<li>{{ repositoryName }}</li>
		</ol>
	</nav>
</template>

<script setup lang="ts">
import type { Repository } from "~/types"
import { Link } from "@inertiajs/vue3"
import { computed } from "vue"
import { useRepositoryName } from "~/composables/useRepositoryName"
import { registryPath } from "~/lib/routes"

interface RepositoryBreadcrumbProps {
	repository?: Repository
}

const props = defineProps<RepositoryBreadcrumbProps>()

const registryHost = computed(() => props.repository?.registryHost || "")
const repositoryName = useRepositoryName(() => props.repository)
const registryHref = computed(() => registryPath(registryHost.value))
</script>
