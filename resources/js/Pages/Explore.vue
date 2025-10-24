<template>
	<div class="h-screen bg-background text-foreground flex flex-col">
		<HeaderComponent />

		<div class="flex flex-1 overflow-hidden relative">
			<!-- Mobile sidebar with Dialog -->
			<MobileDialog v-model="sidebarOpen">
				<SidebarComponent
					:registries="registries"
					:architectures="architectures"
				/>
			</MobileDialog>

			<!-- Static sidebar for desktop -->
			<div class="hidden lg:flex lg:w-80 lg:flex-col">
				<SidebarComponent
					:registries="registries"
					:architectures="architectures"
				/>
			</div>

			<main class="flex-1 lg:p-8 p-4 overflow-y-auto">
				<!-- Results Header -->
				<div class="mb-5 flex items-center gap-3">
					<!-- Mobile Filter Button -->
					<button
						v-ripple
						class="lg:hidden w-10 h-10 bg-background rounded-lg border border-outline flex items-center justify-center hover:opacity-80 transition-opacity"
						aria-label="Open filters menu"
						aria-expanded="false"
						aria-controls="mobile-filters"
						title="Filter repositories"
						@click="sidebarOpen = true"
					>
						<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor" class="text-muted-foreground" aria-hidden="true">
							<path d="M400-240v-80h160v80H400ZM240-440v-80h480v80H240ZM120-640v-80h720v80H120Z" />
						</svg>
					</button>

					<p class="text-muted-foreground text-sm">
						{{ repositories.length || 0 }} of {{ totalRepositories }} available results.
					</p>
				</div>

				<!-- Repository Grid -->
				<div v-auto-animate class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
					<RepositoryCard
						v-for="repo in repositories"
						:key="`${repo.registry}/${repo.name}`"
						:repository="repo"
					/>
				</div>
			</main>
		</div>

		<!-- Footer -->
		<footer class="fixed bottom-4 right-6 text-sm text-muted-foreground backdrop-blur-sm bg-muted/50 px-3 py-1.5 rounded-lg shadow-sm">
			<span class="text-muted-foreground">v0.5.1</span>
			<span class="mx-1 text-muted-foreground">•</span>
			<a href="#" class="text-primary hover:underline">v0.5.4 available</a>
		</footer>

		<!-- Untagged Repository Dialog -->
		<UntaggedDialog />
	</div>
</template>

<script setup lang="ts">
import type { ExploreProps } from "~/types"
import { usePage } from "@inertiajs/vue3"
import { computed, ref, watch } from "vue"
import HeaderComponent from "~/components/HeaderComponent.vue"
import RepositoryCard from "~/components/RepositoryCard.vue"
import SidebarComponent from "~/components/SidebarComponent.vue"
import MobileDialog from "~/components/ui/MobileDialog.vue"
import UntaggedDialog from "~/components/UntaggedDialog.vue"
import { useExploreFilterStore } from "~/stores/useExploreFilterStore"

const page = usePage<ExploreProps>()
const filterStore = useExploreFilterStore()

const sidebarOpen = ref(false)

// Get data from Inertia props
const repositories = computed(() => page.props.repositories || [])
const registries = computed(() => page.props.registries || [])
const totalRepositories = computed(() => page.props.totalRepositories || 0)
const architectures = computed(() => page.props.architectures || [])

// Sync filter state from server on mount and when props change
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
