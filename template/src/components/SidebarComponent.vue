<template>
	<aside class="w-80 bg-background h-full border-r border-outline p-8 flex flex-col">
		<div class="flex-1 overflow-y pr-2 -mr-2">
			<h2 class="text-lg font-semibold mb-6 text-foreground">
				Filter by
			</h2>

			<!-- Registries Section -->
			<div class="mb-6">
				<h3 class="text-sm font-semibold text-foreground mb-2">
					Registries
				</h3>
				<div class="space-y-2">
					<Checkbox
						v-for="registry in registries"
						:id="`registry-${registry.url}`"
						:key="registry.url"
						v-model="filterStore.selectedRegistries"
						:value="registry.url"
						:label="registry.url"
						:status-code="registry.statusCode"
						label-variant="muted"
					/>
				</div>
			</div>

			<!-- Architectures Section -->
			<div class="mb-6">
				<div class="block">
					<span id="architectures-label" class="text-sm font-semibold text-foreground mb-2 block">
						Architectures
					</span>
					<Select v-model="filterStore.selectedArchitecture" aria-labelledby="architectures-label">
						<SelectTrigger placeholder="All Architectures" aria-labelledby="architectures-label">
							{{ filterStore.selectedArchitecture === 'all' ? 'All Architectures' : filterStore.selectedArchitecture }}
						</SelectTrigger>

						<SelectContent>
							<SelectItem value="all" label="All Architectures" />
							<SelectItem v-for="arch in architectures" :key="arch" :value="arch" :label="arch" />
						</SelectContent>
					</Select>
				</div>
			</div>

			<!-- Show untagged repositories -->
			<Checkbox
				id="show-untagged"
				v-model="filterStore.showUntagged"
				label="Show untagged repositories"
				label-variant="default"
			/>
		</div>

		<!-- Settings Button -->
		<Button variant="ghost" class="flex items-center gap-3 w-full px-2 py-2 mt-auto justify-start" @click="settingsStore.openDialog()">
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
			</svg>
			<span class="text-sm">Settings</span>
		</Button>

		<!-- Settings Dialog -->
		<SettingsDialog />
	</aside>
</template>

<script setup lang="ts">
import SettingsDialog from "~/components/SettingsDialog.vue"
import {
	Button,
	Checkbox,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "~/components/ui"
import { useRepositoryFilterStore } from "~/stores/useRepositoryFilterStore"
import { useSettingsStore } from "~/stores/useSettingsStore"

interface RegistryInfo {
	url: string
	statusCode?: number
}

const registries: RegistryInfo[] = [
	{ url: "lot.globalsynergistic.io", statusCode: 200 },
	{ url: "gcr.io", statusCode: 404 }, // Demo: Wrong URL
	{ url: "what.internationalwebservicesonline.com.org", statusCode: 200 },
	{ url: "weekly.districtmonetize.org", statusCode: 503 }, // Demo: Registry Offline
	{ url: "registry.gitlab.com", statusCode: 200 },
]

const architectures = [
	"amd64",
	"arm64",
	"arm/v7",
	"arm/v6",
	"386",
	"ppc64le",
	"s390x",
	"riscv64",
]

// Use Pinia stores
const filterStore = useRepositoryFilterStore()
const settingsStore = useSettingsStore()
</script>
