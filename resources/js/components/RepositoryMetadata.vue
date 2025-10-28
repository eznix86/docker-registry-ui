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
	<div class="mb-6 sm:mb-8 pb-6 sm:pb-8 border-b border-outline">
		<!-- Mobile: Two-column aligned layout -->
		<div class="sm:hidden space-y-3 text-sm">
			<div class="flex items-center justify-between">
				<span class="text-muted-foreground">Tags available</span>
				<span class="font-bold text-foreground">{{ tagsCount }}</span>
			</div>
			<div class="flex items-center justify-between">
				<span class="text-muted-foreground">Total size</span>
				<span class="font-bold text-foreground">{{ formattedSize }}</span>
			</div>
			<div>
				<div class="flex items-center justify-between mb-2">
					<span class="text-muted-foreground">Architectures</span>
					<span class="font-bold text-foreground">{{ architectures.length }}</span>
				</div>
				<div class="relative">
					<div class="overflow-x-auto flex gap-2 scrollbar-hide pb-1 mt-8">
						<Chip v-for="arch in architectures" :key="arch" variant="blue" size="normal">
							{{ arch }}
						</Chip>
					</div>
					<!-- Fade effects -->
					<div class="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent pointer-events-none" />
					<div class="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none" />
				</div>
			</div>
		</div>

		<!-- Desktop: Horizontal inline layout -->
		<div class="hidden sm:flex sm:items-center gap-6 text-base text-foreground">
			<span><strong class="font-bold">{{ tagsCount }}</strong> tags available</span>
			<span>Total size: <strong class="font-bold">{{ formattedSize }}</strong></span>
			<div class="flex items-center gap-2">
				<span class="flex-shrink-0">Architectures:</span>
				<div class="flex flex-wrap gap-2">
					<Chip v-for="arch in architectures" :key="arch" variant="blue" size="normal">
						{{ arch }}
					</Chip>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { RepositoryProps } from "~/types"
import { usePage } from "@inertiajs/vue3"
import { computed } from "vue"
import { Chip } from "~/components/ui"
import { formatBytes } from "~/lib/utils"

const page = usePage<RepositoryProps>()

const tagsCount = computed(() => page.props.repository?.tagsCount || 0)
const totalSizeInBytes = computed(() => page.props.repository?.totalSizeInBytes || 0)
const formattedSize = computed(() => formatBytes(totalSizeInBytes.value))
const architectures = computed(() => page.props.repository?.architectures || [])
</script>
