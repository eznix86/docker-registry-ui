<template>
	<div class="h-screen bg-background text-foreground flex flex-col">
		<HeaderComponent
			@refresh="handleRefresh"
			@search="handleSearch"
		/>

		<div class="flex flex-1 overflow-hidden relative">
			<!-- Mobile sidebar with Dialog -->
			<MobileDialog v-model="sidebarOpen">
				<SidebarComponent />
			</MobileDialog>

			<!-- Static sidebar for desktop -->
			<div class="hidden lg:flex lg:w-80 lg:flex-col">
				<SidebarComponent />
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
						{{ filteredRepositories.length }} of {{ repositories.length }} available results.
					</p>
				</div>

				<!-- Repository Grid -->
				<div v-auto-animate="{ duration: 150, disrespectUserMotionPreference: true }" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
					<RepositoryCard
						v-for="repo in filteredRepositories"
						:key="`${repo.registry}/${repo.name}`"
						:repository="repo"
						@untagged-click="handleUntaggedClick"
					/>
				</div>
			</main>
		</div>

		<!-- Untagged Repository Dialog -->
		<UntaggedDialog
			:is-open="untaggedDialogOpen"
			:repository-name="selectedUntaggedRepository?.name || ''"
			@close="closeUntaggedDialog"
		/>

		<!-- Footer -->
		<footer class="fixed bottom-4 right-6 text-sm text-muted-foreground backdrop-blur-sm bg-muted/50 px-3 py-1.5 rounded-lg shadow-sm">
			<span class="text-muted-foreground">v0.5.1</span>
			<span class="mx-1 text-muted-foreground">•</span>
			<a href="#" class="text-primary hover:underline">v0.5.4 available</a>
		</footer>
	</div>
</template>

<script setup lang="ts">
import type { Repository } from "~/types/repository"
import { computed, ref } from "vue"
import HeaderComponent from "~/components/HeaderComponent.vue"
import RepositoryCard from "~/components/RepositoryCard.vue"
import SidebarComponent from "~/components/SidebarComponent.vue"
import MobileDialog from "~/components/ui/MobileDialog.vue"
import UntaggedDialog from "~/components/UntaggedDialog.vue"
import { useRepositoryFilterStore } from "~/stores/useRepositoryFilterStore"

const sidebarOpen = ref(false)
const untaggedDialogOpen = ref(false)
const selectedUntaggedRepository = ref<Repository | null>(null)

// Use Pinia store for filter state
const filterStore = useRepositoryFilterStore()

const repositories = ref<Repository[]>([
	{
		name: "bitnami/zookeeper-app",
		architectures: [
			"amd64",
			"386",
			"s390x",
			"arm64",
			"riscv64",
			"arm/v7",
			"ppc64le",
			"arm/v6",
		],
		size: "55.53 GB",
		registry: "lot.globalsynergistic.io",
	},
	{
		name: "nginx-api",
		architectures: [
			"riscv64",
			"arm64",
			"amd64",
			"arm/v6",
			"s390x",
			"ppc64le",
			"arm/v7",
			"386",
		],
		size: "51.82 GB",
		registry: "lot.globalsynergistic.io",
	},
	{
		name: "redis",
		architectures: [
			"arm/v7",
			"386",
			"riscv64",
			"arm64",
			"amd64",
			"arm/v6",
			"s390x",
			"ppc64le",
		],
		size: "41.56 GB",
		registry: "lot.globalsynergistic.io",
	},
	{
		name: "kibana-app",
		architectures: [
			"arm64",
			"386",
			"amd64",
			"arm/v6",
			"ppc64le",
			"s390x",
			"riscv64",
			"arm/v7",
		],
		size: "45.70 GB",
		registry: "lot.globalsynergistic.io",
	},
	{
		name: "kibana-app",
		architectures: [],
		size: "0 B",
		registry: "lot.globalsynergistic.io",
		isUntagged: true,
	},
	{
		name: "amazon/vault-service",
		architectures: [
			"arm64",
			"ppc64le",
			"amd64",
			"riscv64",
			"386",
			"s390x",
			"arm/v6",
			"arm/v7",
		],
		size: "54.36 GB",
		registry: "lot.globalsynergistic.io",
	},
	{
		name: "cassandra-prod",
		architectures: ["arm64"],
		size: "345.12 MB",
		registry: "lot.globalsynergistic.io",
	},
	{
		name: "centos-worker",
		architectures: [
			"arm/v6",
			"riscv64",
			"amd64",
			"arm64",
			"arm/v7",
			"s390x",
			"386",
			"ppc64le",
		],
		size: "45.72 GB",
		registry: "gcr.io",
	},
	{
		name: "library/postgres-client",
		architectures: [
			"arm64",
			"arm/v7",
			"arm/v6",
			"s390x",
			"ppc64le",
			"amd64",
			"386",
			"riscv64",
		],
		size: "43.71 GB",
		registry: "gcr.io",
	},
	{
		name: "ubuntu/gitlab-worker",
		architectures: [
			"arm/v6",
			"arm/v7",
			"ppc64le",
			"amd64",
			"arm64",
			"riscv64",
			"386",
			"s390x",
		],
		size: "43.19 GB",
		registry: "gcr.io",
	},
	{
		name: "docker/prometheus-staging",
		architectures: [
			"arm64",
			"386",
			"amd64",
			"s390x",
			"riscv64",
			"arm/v6",
			"arm/v7",
			"ppc64le",
		],
		size: "55.67 GB",
		registry: "gcr.io",
	},
	{
		name: "mongodb-service",
		architectures: [
			"s390x",
			"arm/v7",
			"amd64",
			"riscv64",
			"arm64",
			"386",
			"ppc64le",
			"arm/v6",
		],
		size: "45.07 GB",
		registry: "gcr.io",
	},
	{
		name: "caddy-app",
		architectures: ["riscv64"],
		size: "233.32 MB",
		registry: "gcr.io",
	},
	{
		name: "prometheus/consul-client",
		architectures: [
			"arm64",
			"386",
			"arm/v7",
			"arm/v6",
			"riscv64",
			"s390x",
			"amd64",
			"ppc64le",
		],
		size: "34.92 GB",
		registry: "what.internationalwebservices.org",
	},
	{
		name: "influxdb-service",
		architectures: [
			"ppc64le",
			"amd64",
			"arm64",
			"riscv64",
			"arm/v7",
			"386",
			"s390x",
			"arm/v6",
		],
		size: "41.98 GB",
		registry: "what.internationalwebservices.org",
	},
	{
		name: "amazon/nginx-client",
		architectures: [
			"amd64",
			"riscv64",
			"arm64",
			"arm/v7",
			"386",
			"ppc64le",
			"arm/v6",
			"s390x",
		],
		size: "51.14 GB",
		registry: "what.internationalwebservices.org",
	},
	{
		name: "mongodb-service",
		architectures: [
			"s390x",
			"amd64",
			"arm/v6",
			"arm64",
			"riscv64",
			"ppc64le",
			"arm/v7",
			"386",
		],
		size: "49.41 GB",
		registry: "what.internationalwebservices.org",
	},
	{
		name: "ubuntu-service",
		architectures: [
			"arm64",
			"ppc64le",
			"amd64",
			"arm/v7",
			"riscv64",
			"arm/v6",
			"s390x",
			"386",
		],
		size: "45.09 GB",
		registry: "what.internationalwebservices.org",
	},
	{
		name: "ubuntu/vault",
		architectures: ["amd64"],
		size: "429.54 MB",
		registry: "what.internationalwebservices.org",
	},
	{
		name: "zookeeper-dev",
		architectures: [
			"riscv64",
			"arm/v7",
			"arm64",
			"386",
			"amd64",
			"ppc64le",
			"s390x",
			"arm/v6",
		],
		size: "44.19 GB",
		registry: "weekly.districtmonetize.org",
	},
	{
		name: "prometheus/consul-dev",
		architectures: [
			"arm/v6",
			"amd64",
			"arm64",
			"s390x",
			"386",
			"ppc64le",
			"riscv64",
			"arm/v7",
		],
		size: "54.55 GB",
		registry: "weekly.districtmonetize.org",
	},
	{
		name: "influxdb-service",
		architectures: [
			"arm/v7",
			"amd64",
			"arm/v6",
			"arm64",
			"s390x",
			"386",
			"ppc64le",
			"riscv64",
		],
		size: "48.27 GB",
		registry: "weekly.districtmonetize.org",
	},
	{
		name: "grafana/nginx-api",
		architectures: [
			"riscv64",
			"arm64",
			"amd64",
			"arm/v7",
			"arm/v6",
			"s390x",
			"ppc64le",
			"386",
		],
		size: "37.72 GB",
		registry: "weekly.districtmonetize.org",
	},
	{
		name: "mariadb-dev",
		architectures: [
			"ppc64le",
			"amd64",
			"arm64",
			"riscv64",
			"arm/v7",
			"386",
			"s390x",
			"arm/v6",
		],
		size: "42.87 GB",
		registry: "weekly.districtmonetize.org",
	},
	{
		name: "etcd-staging",
		architectures: [
			"riscv64",
			"arm64",
			"arm/v7",
			"amd64",
			"386",
			"ppc64le",
			"arm/v6",
			"s390x",
		],
		size: "57.84 GB",
		registry: "weekly.districtmonetize.org",
	},
	{
		name: "library/traefik-server",
		architectures: ["arm/v7"],
		size: "225.15 MB",
		registry: "weekly.districtmonetize.org",
	},
	{
		name: "alpine-worker",
		architectures: [
			"386",
			"arm64",
			"amd64",
			"ppc64le",
			"arm/v6",
			"riscv64",
			"arm/v7",
			"s390x",
		],
		size: "50.86 GB",
		registry: "registry.gitlab.com",
	},
	{
		name: "docker/prometheus-server",
		architectures: [
			"arm/v7",
			"arm64",
			"386",
			"arm/v6",
			"riscv64",
			"s390x",
			"amd64",
			"ppc64le",
		],
		size: "37.07 GB",
		registry: "registry.gitlab.com",
	},
	{
		name: "jenkins",
		architectures: [
			"ppc64le",
			"s390x",
			"386",
			"amd64",
			"arm64",
			"arm/v6",
			"riscv64",
			"arm/v7",
		],
		size: "38.82 GB",
		registry: "registry.gitlab.com",
	},
	{
		name: "node-server",
		architectures: [
			"arm64",
			"s390x",
			"amd64",
			"riscv64",
			"arm/v7",
			"386",
			"ppc64le",
			"arm/v6",
		],
		size: "56.03 GB",
		registry: "registry.gitlab.com",
	},
	{
		name: "debian/rabbitmq-app",
		architectures: [
			"amd64",
			"arm/v6",
			"arm64",
			"s390x",
			"ppc64le",
			"arm/v7",
			"386",
			"riscv64",
		],
		size: "48.35 GB",
		registry: "registry.gitlab.com",
	},
	{
		name: "elastic/vault-app",
		architectures: [
			"riscv64",
			"s390x",
			"arm64",
			"amd64",
			"386",
			"arm/v7",
			"arm/v6",
			"ppc64le",
		],
		size: "44.48 GB",
		registry: "registry.gitlab.com",
	},
	{
		name: "rabbitmq",
		architectures: ["arm64"],
		size: "354.78 MB",
		registry: "registry.gitlab.com",
	},
])

// Actually filter repositories based on sidebar state and search query
const filteredRepositories = computed(() => {
	return repositories.value.filter((repo) => {
		// Filter out untagged repositories unless showUntagged is enabled
		if (repo.isUntagged && !filterStore.showUntagged) {
			return false
		}

		// Filter by registries
		if (
			filterStore.selectedRegistries.length > 0
			&& !filterStore.selectedRegistries.includes(repo.registry)
		) {
			return false
		}

		// Filter by architecture
		if (
			filterStore.selectedArchitecture
			&& filterStore.selectedArchitecture !== "all"
			&& !repo.architectures.includes(filterStore.selectedArchitecture)
		) {
			return false
		}

		// Filter by search query
		if (
			filterStore.searchQuery
			&& !repo.name.toLowerCase().includes(filterStore.searchQuery.toLowerCase())
		) {
			return false
		}

		return true
	})
})

// Handle events from HeaderComponent
function handleRefresh() {
	// TODO: Add actual refresh logic
}

function handleSearch(query: string) {
	filterStore.setSearchQuery(query)
}

function handleUntaggedClick(repository: Repository) {
	selectedUntaggedRepository.value = repository
	untaggedDialogOpen.value = true
}

function closeUntaggedDialog() {
	untaggedDialogOpen.value = false
	selectedUntaggedRepository.value = null
}
</script>
