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
	<header class="bg-gradient-to-r from-primary to-accent flex items-center justify-between shadow-md h-16">
		<div class="flex items-center flex-1 md:pl-6 pl-4">
			<a
				v-ripple
				href="/"
				class="w-12 h-12 p-3 hover:bg-white/10 rounded-full transition-colors inline-flex items-center justify-center md:-ml-3 -ml-2 mr-4"
				aria-label="ContainerHub home"
				title="Go to home"
			>
				<svg class="w-6 h-6" viewBox="0 0 240 130" aria-hidden="true">
					<path fill="white" stroke="white" stroke-width="38" d="m198 111h42m-92 0h42m-91 0h42m-91 0h41m-91 0h42m8-46h41m8 0h42m7 0h42m-42-46h42" />
				</svg>
			</a>

			<span class="text-xl font-black text-white hidden lg:inline">ContainerHub</span>

			<!-- Search Bar -->
			<div class="flex-1 max-w-xl relative mx-auto" role="search">
				<div class="relative flex items-center">
					<svg class="absolute left-4 w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
					</svg>
					<input
						v-model="localSearch"
						type="search"
						placeholder="Search repositories..."
						aria-label="Search repositories"
						class="w-full bg-white/10 text-white placeholder-white/50 pl-12 pr-3 sm:pr-14 py-2 text-sm sm:text-base rounded-lg focus:outline-none focus:ring-2 focus:ring-white/30 focus:bg-white/15 transition-colors [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
						@input="handleSearchInput"
					>
					<span class="absolute right-3 text-xs bg-white/15 px-2 py-1 rounded text-white/50 hidden sm:inline" aria-label="Keyboard shortcut Command K">⌘K</span>
				</div>
			</div>
		</div>

		<!-- Refresh Button -->
		<button
			v-ripple
			class="w-12 h-12 p-3 hover:bg-white/10 rounded-full transition-colors inline-flex items-center justify-center mr-6"
			aria-label="Refresh repositories"
			title="Refresh repositories"
			@click="handleRefresh"
		>
			<svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
				<path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
			</svg>
		</button>
	</header>
</template>

<script setup lang="ts">
import { ref, watch } from "vue"
import { useExploreFilterStore } from "~/stores/useExploreFilterStore"

const filterStore = useExploreFilterStore()

// Local search state synced with store
const localSearch = ref(filterStore.localSearch)

// Watch for changes from store (when navigating back)
watch(
	() => filterStore.localSearch,
	(newValue) => {
		localSearch.value = newValue
	},
)

function handleSearchInput() {
	filterStore.setSearch(localSearch.value)
}

function handleRefresh() {
	window.location.reload()
}
</script>
