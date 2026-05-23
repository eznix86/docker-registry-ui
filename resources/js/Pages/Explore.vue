


<template>
	<AppLayout>
		<div class="h-screen bg-background text-foreground flex flex-col">
			<HeaderComponent />

			<div class="flex flex-1 overflow-hidden relative">
				<MobileDialog v-model="sidebarOpen">
					<SidebarComponent :registries="registryList" :architectures="architectureList" />
				</MobileDialog>

				<div class="hidden lg:flex lg:w-80 lg:flex-col">
					<SidebarComponent :registries="registryList" :architectures="architectureList" />
				</div>

				<main v-auto-animate class="flex-1 lg:p-8 p-4 overflow-y-auto">
					<ExploreResultsHeader :displayed-count="repositories.length" :total-count="totalRepos" @toggle-sidebar="sidebarOpen = true" />
					<SyncProgress />

					<div v-auto-animate class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
						<RepositoryCard
							v-for="repo in repositories"
							:key="`${repo.registry}/${repo.namespace}+${repo.name}`"
							v-memo="[repo.name, repo.tagsCount, repo.totalSizeInBytes]"
							:repository="repo"
							@show-untagged="openUntagged"
						/>
					</div>
				</main>
			</div>

			<UntaggedDialog ref="untaggedRef" />
		</div>
	</AppLayout>
</template>

<script setup lang="ts">
import type { ExploreProps, Repository } from "~/types"
import { usePage } from "@inertiajs/vue3"
import { computed, defineAsyncComponent, ref } from "vue"
import ExploreResultsHeader from "~/components/ExploreResultsHeader.vue"
import HeaderComponent from "~/components/HeaderComponent.vue"
import RepositoryCard from "~/components/RepositoryCard.vue"
import SidebarComponent from "~/components/SidebarComponent.vue"
import SyncProgress from "~/components/SyncProgress.vue"
import MobileDialog from "~/components/ui/MobileDialog.vue"
import { useAutoRefreshOnSync } from "~/composables/useAutoRefreshOnSync"
import AppLayout from "~/layouts/AppLayout.vue"

const UntaggedDialog = defineAsyncComponent(() => import("~/components/UntaggedDialog.vue"))

const page = usePage<ExploreProps>()
const repositories = computed(() => page.props.repositories || [])
const architectureList = computed(() => page.props.architectures || [])
const totalRepos = computed(() => page.props.totalRepositories || 0)
const sidebarOpen = ref(false)
const registryList = computed(() => page.props.registries || [])
const untaggedRef = ref<InstanceType<typeof UntaggedDialog> | null>(null)

function openUntagged(repo: Repository) {
	untaggedRef.value?.open(repo)
}

useAutoRefreshOnSync()
</script>
