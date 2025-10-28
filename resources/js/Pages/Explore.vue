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
	<div class="h-screen bg-background text-foreground flex flex-col">
		<HeaderComponent />

		<div class="flex flex-1 overflow-hidden relative">
			<MobileDialog v-model="filterStore.sidebarOpen">
				<SidebarComponent />
			</MobileDialog>

			<div class="hidden lg:flex lg:w-80 lg:flex-col">
				<SidebarComponent />
			</div>

			<main class="flex-1 lg:p-8 p-4 overflow-y-auto">
				<ExploreResultsHeader />

				<div v-auto-animate class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
					<RepositoryCard
						v-for="repo in repositories"
						:key="`${repo.registry}/${repo.name}`"
						v-memo="[repo.name, repo.tagsCount, repo.totalSizeInBytes]"
						:repository="repo"
					/>
				</div>
			</main>
		</div>

		<VersionFooter
			current-version="v0.5.1"
			latest-version="v0.5.4"
			update-url="#"
		/>

		<UntaggedDialog />
	</div>
</template>

<script setup lang="ts">
import type { ExploreProps } from "~/types"
import { usePage } from "@inertiajs/vue3"
import { computed, defineAsyncComponent, watch } from "vue"
import ExploreResultsHeader from "~/components/ExploreResultsHeader.vue"
import HeaderComponent from "~/components/HeaderComponent.vue"
import RepositoryCard from "~/components/RepositoryCard.vue"
import SidebarComponent from "~/components/SidebarComponent.vue"
import MobileDialog from "~/components/ui/MobileDialog.vue"
import VersionFooter from "~/components/VersionFooter.vue"
import { useExploreFilterStore } from "~/stores/useExploreFilterStore"

const UntaggedDialog = defineAsyncComponent(() => import("~/components/UntaggedDialog.vue"))

const page = usePage<ExploreProps>()
const filterStore = useExploreFilterStore()

const repositories = computed(() => page.props.repositories || [])

watch(
	() => page.props.filters,
	(filters) => {
		if (filters) {
			filterStore.setRegistries(filters.registries || [])
			filterStore.setArchitectures(filters.architectures || [])
			filterStore.setShowUntagged(filters.showUntagged || false)
			filterStore.setSelectedSearch(filters.search || "")
			filterStore.setLocalSearch(filters.search || "")
		}
	},
	{ immediate: true },
)
</script>
