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
			<li class="opacity-60">
				{{ registryHost }}
			</li>
			<li>/</li>
			<li>{{ repositoryName }}</li>
		</ol>
	</nav>
</template>

<script setup lang="ts">
import type { RepositoryProps } from "~/types"
import { Link, usePage } from "@inertiajs/vue3"
import { computed } from "vue"
import { useRepositoryName } from "~/composables/useRepositoryName"

const page = usePage<RepositoryProps>()
const repository = computed(() => page.props.repository)

const registryHost = computed(() => repository.value?.registry || "")
const repositoryName = useRepositoryName(repository)
</script>
