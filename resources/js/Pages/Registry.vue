


<template>
	<AppLayout>
		<div class="h-screen bg-background text-foreground flex flex-col">
			<HeaderComponent />

			<main class="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
				<nav class="mb-4 flex flex-col gap-2 text-muted-foreground text-base leading-6 sm:mb-6 sm:flex-row sm:flex-wrap sm:items-center">
					<Link href="/" prefetch class="text-primary hover:underline">
						Explore
					</Link>
					<span class="hidden sm:inline">/</span>
					<div class="w-full max-w-[min(36rem,calc(100vw-2rem))] sm:w-auto sm:min-w-72">
						<span id="registry-switcher-label" class="sr-only">Select registry</span>
						<Select :model-value="registry?.host" aria-labelledby="registry-switcher-label" @update:model-value="handleRegistrySelect">
							<SelectTrigger aria-labelledby="registry-switcher-label">
								{{ selectedRegistryLabel }}
							</SelectTrigger>
							<SelectContent>
								<SelectItem v-for="item in registries" :key="item.host" :value="item.host" :label="formatRegistryOption(item)" />
							</SelectContent>
						</Select>
					</div>
				</nav>

				<div class="mx-auto w-full max-w-[1280px] space-y-6 sm:space-y-7">
					<section class="border border-outline rounded-lg bg-card px-5 py-4 sm:px-6 sm:py-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.05)]">
						<div class="grid grid-cols-1 gap-y-3 md:grid-cols-[minmax(0,1fr)_auto] md:grid-rows-[auto_auto] md:gap-x-6 md:gap-y-1">
							<div class="min-w-0 md:row-start-1 md:col-start-1">
								<p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
									{{ registryTitle }}
								</p>
							</div>

							<div class="md:row-start-1 md:col-start-2 md:self-start md:justify-self-end">
								<Chip :variant="statusChipVariant" size="normal" class="font-semibold tracking-[0.16em]">
									{{ registry?.status ?? 0 }}
								</Chip>
							</div>

							<div class="min-w-0 md:row-start-2 md:col-start-1 md:self-end">
								<h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight text-foreground break-words">
									{{ registry?.host }}
								</h1>
							</div>
						</div>
					</section>

					<section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
						<article class="border border-outline rounded-lg bg-card px-5 py-4 sm:px-6 shadow-[0_1px_3px_0_rgba(0,0,0,0.05)]">
							<p class="text-sm text-muted-foreground">
								Repositories
							</p>
							<p class="mt-2 text-3xl font-bold tracking-tight">
								{{ stats?.repositoryCount ?? 0 }}
							</p>
						</article>
						<article class="border border-outline rounded-lg bg-card px-5 py-4 sm:px-6 shadow-[0_1px_3px_0_rgba(0,0,0,0.05)]">
							<p class="text-sm text-muted-foreground">
								Tags
							</p>
							<p class="mt-2 text-3xl font-bold tracking-tight">
								{{ stats?.tagCount ?? 0 }}
							</p>
						</article>
						<article class="border border-outline rounded-lg bg-card px-5 py-4 sm:px-6 shadow-[0_1px_3px_0_rgba(0,0,0,0.05)]">
							<p class="text-sm text-muted-foreground">
								Estimated Storage
							</p>
							<p class="mt-2 text-3xl font-bold tracking-tight">
								{{ formatBytes(stats?.estimatedStorageBytes ?? 0) }}
							</p>
						</article>
						<article class="border border-outline rounded-lg bg-card px-5 py-4 sm:px-6 shadow-[0_1px_3px_0_rgba(0,0,0,0.05)]">
							<p class="text-sm text-muted-foreground">
								Architectures
							</p>
							<p class="mt-2 text-3xl font-bold tracking-tight">
								{{ stats?.architectureCount ?? 0 }}
							</p>
						</article>
					</section>

					<section class="grid gap-5 xl:grid-cols-2">
						<article class="border border-outline rounded-lg bg-card p-5 sm:p-6 space-y-4 shadow-[0_1px_3px_0_rgba(0,0,0,0.05)]">
							<div>
								<h2 class="text-lg font-semibold">
									Storage by Namespace
								</h2>
								<p class="mt-1 text-sm text-muted-foreground">
									Grouped under <code>library</code> when the namespace is empty.
								</p>
							</div>
							<RegistryPieChart
								:items="storageChart"
								:formatter="formatBytes"
								:max-items="5"
								aggregate-label="other"
							/>
						</article>

						<article class="border border-outline rounded-lg bg-card p-5 sm:p-6 space-y-4 shadow-[0_1px_3px_0_rgba(0,0,0,0.05)]">
							<div>
								<h2 class="text-lg font-semibold">
									Architecture Coverage
								</h2>
								<p class="mt-1 text-sm text-muted-foreground">
									Repository count per discovered architecture.
								</p>
							</div>
							<RegistryPieChart
								:items="architectureChart"
								:formatter="formatCount"
								:max-items="4"
								aggregate-label="other"
							/>
						</article>
					</section>

					<section class="border border-outline rounded-lg bg-card p-5 sm:p-6 space-y-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.05)]">
						<div>
							<h2 class="text-lg font-semibold">
								Repositories
							</h2>
							<p class="mt-1 text-sm text-muted-foreground">
								Browse the repositories in this registry by size.
							</p>
						</div>

						<SegmentedHorizontalBarChart
							:items="repositorySizeChart"
							:formatter="formatBytes"
							:max-items="6"
							aggregate-label="other"
						/>

						<div class="border border-outline rounded-lg overflow-x-auto">
							<table class="w-full border-collapse bg-background min-w-[500px]">
								<thead class="text-left text-sm text-muted-foreground">
									<tr>
										<th class="py-1.5 px-4 font-semibold border-b border-outline">
											Name
										</th>
										<th class="py-1.5 px-4 font-semibold border-b border-outline">
											Tags
										</th>
										<th class="py-1.5 px-4 font-semibold border-b border-outline">
											Size
										</th>
									</tr>
								</thead>
								<tbody>
									<tr v-for="repo in repositories" :key="repo.id" class="hover:bg-muted transition-colors">
										<td class="py-1.5 px-4 text-sm text-primary border-b border-outline">
											<Link :href="repositoryUrl(repo)" prefetch class="hover:underline">
												{{ repo.displayName }}
											</Link>
										</td>
										<td class="py-1.5 px-4 text-sm tabular-nums text-muted-foreground border-b border-outline">
											{{ repo.tagsCount }}
										</td>
										<td class="py-1.5 px-4 text-sm tabular-nums text-muted-foreground border-b border-outline">
											{{ formatBytes(repo.totalSizeInBytes) }}
										</td>
									</tr>
								</tbody>
							</table>
						</div>
					</section>
				</div>
			</main>
		</div>
	</AppLayout>
</template>

<script setup lang="ts">
import type {
	RegistryPageProps,
	RegistryRepositoryRow,
} from "~/types"
import { Link, router, usePage } from "@inertiajs/vue3"
import { computed, defineAsyncComponent } from "vue"
import HeaderComponent from "~/components/HeaderComponent.vue"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "~/components/ui"
import Chip from "~/components/ui/Chip.vue"
import AppLayout from "~/layouts/AppLayout.vue"
import { normalizeArray } from "~/lib/normalize"
import { registryPath, repositoryPath } from "~/lib/routes"
import { formatBytes } from "~/lib/utils"

const RegistryPieChart = defineAsyncComponent(() => import("~/components/RegistryPieChart.vue"))
const SegmentedHorizontalBarChart = defineAsyncComponent(() => import("~/components/SegmentedHorizontalBarChart.vue"))

const page = usePage<RegistryPageProps>()

const registry = computed(() => page.props.registry)
const registries = computed(() => normalizeArray(page.props.registries))
const stats = computed(() => page.props.stats)
const repositories = computed(() => normalizeArray(page.props.repositories))
const storageByNamespace = computed(() => normalizeArray(page.props.charts?.storageByNamespace))
const architectureCoverage = computed(() => normalizeArray(page.props.charts?.architectureCoverage))

const statusChipVariant = computed(() => (registry.value?.status === 200 ? "primary" : "warning"))

const registryTitle = computed(() => {
	const name = registry.value?.name?.trim()
	if (!name) {
		return "REGISTRY"
	}
	return `${name} registry`.toUpperCase()
})

const storageChart = computed(() => storageByNamespace.value.map(item => ({
	label: item.displayName,
	value: item.totalSizeBytes,
})))

const architectureChart = computed(() => architectureCoverage.value.map(item => ({
	label: item.architecture,
	value: item.repositoryCount,
})))

const repositorySizeChart = computed(() => repositories.value.map(repo => ({
	label: repo.displayName,
	value: repo.totalSizeInBytes,
})))

const selectedRegistryLabel = computed(() => {
	const current = registries.value.find(item => item.host === registry.value?.host)
	if (current) {
		return formatRegistryOption(current)
	}

	return registry.value?.host ?? "Select registry"
})

function repositoryUrl(repo: RegistryRepositoryRow): string {
	return repositoryPath(repo, registry.value?.host || "")
}

function formatCount(value: number) {
	return value.toString()
}

function formatRegistryOption(item: { host: string, name?: string, status?: number }) {
	if (item.name?.trim()) {
		return `${item.name} (${item.host})`
	}

	return item.host
}

function handleRegistrySelect(value: string | number | undefined) {
	if (!value || typeof value !== "string") {
		return
	}

	const host = value
	if (!host || host === registry.value?.host) {
		return
	}

	router.visit(registryPath(host))
}
</script>
