<template>
	<aside class="w-80 bg-background h-full border-r border-outline p-8 flex flex-col">
		<div class="flex-1 overflow-y pr-2 -mr-2">
			<h2 class="text-lg font-semibold mb-6 text-foreground">
				Filter by
			</h2>

			<div class="mb-6">
				<h3 class="text-sm font-semibold text-foreground mb-2">
					Registries
				</h3>
				<div class="space-y-2">
					<Checkbox
						v-for="registry in registries"
						:id="`registry-${registry.host}`"
						:key="registry.host"
						v-model="selectedRegistries"
						:value="registry.host"
						:label="registry.host"
						:status-code="registry.status"
						label-variant="muted"
					/>
				</div>
			</div>

			<div class="mb-6">
				<div class="block">
					<span id="architectures-label" class="text-sm font-semibold text-foreground mb-2 block">
						Architectures
					</span>
					<Select :model-value="selectedArchitecture" aria-labelledby="architectures-label" @update:model-value="handleArchitectureChange">
						<SelectTrigger placeholder="All Architectures" aria-labelledby="architectures-label">
							{{ selectedArchitecture === 'all' ? 'All Architectures' : selectedArchitecture }}
						</SelectTrigger>

						<SelectContent>
							<SelectItem value="all" label="All Architectures" />
							<SelectItem v-for="arch in architectures" :key="arch" :value="arch" :label="arch" />
						</SelectContent>
					</Select>
				</div>
			</div>

			<Checkbox
				id="show-untagged"
				v-model="showUntagged"
				label="Show untagged repositories"
				label-variant="default"
			/>
		</div>

		<Button variant="ghost" class="flex items-center gap-3 w-full px-2 py-2 mt-auto justify-start" @click="preferencesStore.openSettingsDialog">
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
			</svg>
			<span class="text-sm">Settings</span>
		</Button>

		<SettingsDialog />
	</aside>
</template>

<script setup lang="ts">
import type { ExploreProps } from "~/types"
import { usePage } from "@inertiajs/vue3"
import { computed, defineAsyncComponent } from "vue"
import {
	Button,
	Checkbox,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "~/components/ui"
import { useAppPreferencesStore } from "~/stores/useAppPreferencesStore"
import { useExploreFilterStore } from "~/stores/useExploreFilterStore"

const SettingsDialog = defineAsyncComponent(() => import("~/components/SettingsDialog.vue"))

const page = usePage<ExploreProps>()
const filterStore = useExploreFilterStore()
const preferencesStore = useAppPreferencesStore()

const registries = computed(() => page.props.registries || [])
const architectures = computed(() => page.props.architectures || [])

const selectedRegistries = computed({
	get: () => filterStore.selectedRegistries,
	set: (value: string[]) => {
		const added = value.filter(v => !filterStore.selectedRegistries.includes(v))
		const removed = filterStore.selectedRegistries.filter(v => !value.includes(v))

		if (added.length > 0 && added[0]) {
			filterStore.toggleRegistry(added[0])
		}
		else if (removed.length > 0 && removed[0]) {
			filterStore.toggleRegistry(removed[0])
		}
	},
})

const selectedArchitecture = computed(() => {
	return filterStore.selectedArchitectures[0] || "all"
})

const showUntagged = computed({
	get: () => filterStore.selectedShowUntagged,
	set: (value: boolean) => {
		if (value !== filterStore.selectedShowUntagged) {
			filterStore.toggleShowUntagged()
		}
	},
})

function handleArchitectureChange(value: string | number | undefined) {
	if (!value || typeof value !== "string")
		return
	filterStore.setArchitecture(value === "all" ? null : value)
}
</script>
