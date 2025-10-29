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
	<component
		:is="isUntagged ? 'button' : Link"
		:href="isUntagged ? undefined : getRepositoryUrl()"
		:prefetch="isUntagged ? undefined : ['hover', 'mousedown']"
		:class="isUntagged ? 'block w-full text-left' : 'block'"
		:aria-label="`${isUntagged ? 'Show untagged repository information for' : 'View details for'} ${repository.name} repository`"
		@click="
			isUntagged ? untaggedDialogStore.openDialog(repository) : undefined
		"
	>
		<Card
			v-ripple
			variant="interactive"
			:class="isUntagged ? 'p-3 h-42 cursor-help' : 'p-3 h-42'"
		>
			<CardHeader>{{ repository.name }}</CardHeader>

			<CardBody>
				<div class="flex flex-wrap gap-1">
					<Chip v-if="isUntagged" variant="warning">
						untagged
					</Chip>
					<Chip
						v-for="arch in repository.architectures || []"
						:key="arch"
					>
						{{ arch }}
					</Chip>
				</div>
			</CardBody>

			<CardFooter>
				<span class="text-muted-foreground font-medium">
					Size
					<span class="text-xs font-normal">{{
						formatBytes(repository.totalSizeInBytes || 0)
					}}</span>
				</span>
				<span class="text-muted-foreground italic text-xs">{{
					repository.registryHost
				}}</span>
			</CardFooter>
		</Card>
	</component>
</template>

<script setup lang="ts">
import type { Repository } from "~/types"
import { Link } from "@inertiajs/vue3"
import { computed } from "vue"
import { Card, CardBody, CardFooter, CardHeader, Chip } from "~/components/ui"
import { formatBytes } from "~/lib/utils"
import { useUntaggedDialogStore } from "~/stores/useUntaggedDialogStore"

const props = defineProps<{
	repository: Repository
}>()

const untaggedDialogStore = useUntaggedDialogStore()

const isUntagged = computed(() => props.repository.tagsCount === 0)

function getRepositoryUrl(): string {
	const { registry, namespace, name } = props.repository

	if (!registry || registry.trim() === "") {
		console.error(
			`Repository "${name}" has empty registry:`,
			props.repository,
		)
		return "#"
	}

	if (namespace && namespace.trim() !== "" && namespace !== name) {
		return `/r/${registry}/${namespace}/${name}`
	}

	return `/r/${registry}/${name}`
}
</script>
