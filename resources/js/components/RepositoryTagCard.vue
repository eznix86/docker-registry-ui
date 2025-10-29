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
	<div class="border border-outline rounded-lg bg-card p-4 sm:p-6">
		<!-- Tag Header -->
		<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4">
			<div class="flex items-center justify-between sm:justify-start gap-3 sm:gap-4">
				<div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 min-w-0">
					<h2 class="text-lg font-semibold leading-7 text-primary">
						{{ tag.name }}
					</h2>
					<span class="text-sm text-muted-foreground">Last updated {{ lastUpdated }}</span>
				</div>
				<button
					v-ripple
					class="p-2 hover:bg-muted rounded transition-colors shrink-0 sm:order-last effect-hover-destructive effect-ripple-destructive"
					:aria-label="`Delete tag ${tag.name}`"
					:title="`Delete tag ${tag.name}`"
					@click="tagDeleteStore.openDialog(tag)"
				>
					<svg class="w-5 h-5 text-destructive" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
						<path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
					</svg>
				</button>
			</div>
			<CopyCommand
				:command="pullCommand"
				:aria-label="`Copy pull command for ${tag.name}`"
			/>
		</div>

		<!-- Digest Table -->
		<div class="border border-outline rounded-lg overflow-x-auto">
			<table class="w-full border-collapse bg-background min-w-[500px]">
				<thead class="text-left text-sm text-muted-foreground">
					<tr>
						<th class="py-1.5 px-4 font-semibold border-b border-outline">
							Digest
						</th>
						<th class="py-1.5 px-4 font-semibold border-b border-outline">
							OS/ARCH
						</th>
						<th class="py-1.5 px-4 font-semibold border-b border-outline">
							Size
						</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="(image, idx) in tag.images" :key="idx" class="hover:bg-muted transition-colors">
						<td class="py-1.5 px-4 text-sm text-primary border-b border-outline">
							{{ image.digest.substring(0, 19) }}
						</td>
						<td class="py-1.5 px-4 text-sm text-muted-foreground border-b border-outline">
							{{ image.os }}/{{ image.architecture }}{{ image.variant ? `/${image.variant}` : '' }}
						</td>
						<td class="py-1.5 px-4 text-sm text-muted-foreground border-b border-outline">
							{{ formatBytes(image.size) }}
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { RepositoryProps, Tag } from "~/types"
import { usePage } from "@inertiajs/vue3"
import { useTimeAgo } from "@vueuse/core"
import { computed } from "vue"
import CopyCommand from "~/components/ui/CopyCommand.vue"
import { useRepositoryName } from "~/composables/useRepositoryName"
import { formatBytes } from "~/lib/utils"
import { useAppPreferencesStore } from "~/stores/useAppPreferencesStore"
import { useTagDeleteStore } from "~/stores/useTagDeleteStore"

interface RepositoryTagCardProps {
	tag: Tag
}

const props = defineProps<RepositoryTagCardProps>()

const preferencesStore = useAppPreferencesStore()
const tagDeleteStore = useTagDeleteStore()
const page = usePage<RepositoryProps>()

const repository = computed(() => page.props.repository)
const registryHost = computed(() => repository.value?.registryHost || "")
const repositoryName = useRepositoryName(repository)

const pullCommand = computed(() =>
	preferencesStore.getPullCommand(registryHost.value, repositoryName.value, props.tag.name),
)

const lastUpdated = computed(() => useTimeAgo(props.tag.createdAt).value)
</script>
