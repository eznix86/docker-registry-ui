<!--
SPDX-License-Identifier: AGPL-3.0-or-later
Copyright (C) 2025  Bruno Bernard

This file is part of Docker Registry UI (Container Hub).

Docker Registry UI is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

Docker Registry UI is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
-->

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

const registryHost = computed(() => repository.value?.registryHost || "")
const repositoryName = useRepositoryName(repository)
</script>
