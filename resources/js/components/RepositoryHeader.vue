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
	<div class="flex items-start justify-between gap-4 mb-4">
		<h1 class="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight lg:leading-[56.7px] text-foreground break-words min-w-0">
			{{ repositoryName }}
		</h1>
		<button
			v-ripple
			class="p-2 text-destructive effect-hover-destructive effect-ripple-destructive rounded transition-colors flex-shrink-0"
			aria-label="Delete tags"
			title="Delete tags"
			@click="bulkDeleteStore.openDialog"
		>
			<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
				<path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
			</svg>
		</button>
	</div>
</template>

<script setup lang="ts">
import type { RepositoryProps } from "~/types"
import { usePage } from "@inertiajs/vue3"
import { computed } from "vue"
import { useRepositoryName } from "~/composables/useRepositoryName"
import { useTagBulkDeleteStore } from "~/stores/useTagBulkDeleteStore"

const bulkDeleteStore = useTagBulkDeleteStore()
const page = usePage<RepositoryProps>()
const repository = computed(() => page.props.repository)
const repositoryName = useRepositoryName(repository)
</script>
