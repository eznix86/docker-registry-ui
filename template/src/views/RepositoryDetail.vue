<template>
	<div class="h-screen bg-background text-foreground flex flex-col">
		<HeaderComponent />

		<main class="flex-1 p-4 sm:p-6 overflow-y-auto">
			<!-- Breadcrumb Navigation -->
			<nav class="mb-4 sm:mb-6">
				<ol class="flex flex-wrap items-center gap-2 text-xs sm:text-sm md:text-base text-muted-foreground">
					<li>
						<router-link to="/" class="text-primary hover:underline">
							Explore
						</router-link>
					</li>
					<li>/</li>
					<li class="opacity-60">
						lot.globalsynergistic.io
					</li>
					<li>/</li>
					<li>bitnami/zookeeper-app</li>
				</ol>
			</nav>

			<!-- Repository Header -->
			<div class="flex items-start justify-between gap-4 mb-4">
				<h1 class="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight lg:leading-[56.7px] text-foreground break-words min-w-0">
					bitnami/zookeeper-app
				</h1>
				<button
					v-ripple
					class="p-2 text-destructive effect-hover-destructive effect-ripple-destructive rounded transition-colors flex-shrink-0"
					aria-label="Delete tags"
					title="Delete tags"
					@click="openBulkDeleteDialog"
				>
					<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
						<path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
					</svg>
				</button>
			</div>

			<!-- Repository Metadata -->
			<div class="mb-6 sm:mb-8 pb-6 sm:pb-8 border-b border-outline">
				<!-- Mobile: Two-column aligned layout -->
				<div class="sm:hidden space-y-3 text-sm">
					<div class="flex items-center justify-between">
						<span class="text-muted-foreground">Tags available</span>
						<span class="font-bold text-foreground">238</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-muted-foreground">Total size</span>
						<span class="font-bold text-foreground">55.53 GB</span>
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
					<span><strong class="font-bold">238</strong> tags available</span>
					<span>Total size: <strong class="font-bold">55.53 GB</strong></span>
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

			<!-- Sort and Filter Controls -->
			<div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:justify-between mb-6">
				<div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
					<div class="flex items-center gap-3 w-full md:w-48">
						<span id="sort-by-label" class="text-muted-foreground text-sm whitespace-nowrap">Sort by</span>
						<Select v-model="tagFilterStore.sortBy" aria-labelledby="sort-by-label">
							<SelectTrigger aria-labelledby="sort-by-label">
								{{ tagFilterStore.sortBy }}
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="Newest" label="Newest" />
								<SelectItem value="Oldest" label="Oldest" />
								<SelectItem value="Name" label="Name" />
							</SelectContent>
						</Select>
					</div>

					<div class="relative w-full sm:w-64">
						<svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
						</svg>
						<input
							id="filter-tags-input"
							v-model="tagFilterStore.filterQuery"
							type="text"
							placeholder="Filter tags"
							aria-label="Filter tags"
							class="w-full pl-10 pr-3.5 py-[7.5px] border border-field rounded-lg focus:outline-none focus:ring-2 focus:ring-focus focus:border-transparent text-sm leading-[23px]"
						>
					</div>
				</div>

				<span class="text-muted-foreground text-sm">{{ filteredTags.length }} of {{ tags.length }} tags</span>
			</div>

			<!-- Tags List -->
			<div class="space-y-6">
				<div v-for="tag in filteredTags" :key="tag.name" class="border border-outline rounded-lg bg-card p-4 sm:p-6">
					<!-- Tag Header -->
					<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4">
						<div class="flex items-center justify-between sm:justify-start gap-3 sm:gap-4">
							<div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 min-w-0">
								<h2 class="text-lg font-semibold leading-7 text-primary">
									{{ tag.name }}
								</h2>
								<span class="text-sm text-muted-foreground">Last updated {{ tag.lastUpdated }}</span>
							</div>
							<button
								v-ripple
								class="p-2 hover:bg-muted rounded transition-colors flex-shrink-0 sm:order-last effect-hover-destructive effect-ripple-destructive"
								:aria-label="`Delete tag ${tag.name}`"
								:title="`Delete tag ${tag.name}`"
								@click="openDeleteTagDialog(tag)"
							>
								<svg class="w-5 h-5 text-destructive" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
									<path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
								</svg>
							</button>
						</div>
						<CopyCommand
							:command="getPullCommand('lot.globalsynergistic.io', 'bitnami/zookeeper-app', tag.name)"
							:aria-label="`Copy pull command for ${tag.name}`"
						/>
					</div>

					<!-- Digest Table -->
					<div class="border border-outline rounded-lg overflow-x-auto">
						<table class="w-full border-collapse bg-background min-w-[500px]">
							<thead class="text-left text-sm text-muted-foreground">
								<tr>
									<th class="py-1.5 px-4 font-semibold border-b border-outline">
										Digest
									</th>
									<th class="py-1.5 px-4 font-semibold border-b border-outline">
										OS/ARCH
									</th>
									<th class="py-1.5 px-4 font-semibold border-b border-outline">
										Size
									</th>
								</tr>
							</thead>
							<tbody>
								<tr v-for="(digest, idx) in tag.digests" :key="idx" class="hover:bg-muted transition-colors">
									<td class="py-1.5 px-4 text-sm text-primary border-b border-outline">
										{{ digest.sha.substring(0, 19) }}
									</td>
									<td class="py-1.5 px-4 text-sm text-muted-foreground border-b border-outline">
										{{ digest.os }}/{{ digest.arch }}
									</td>
									<td class="py-1.5 px-4 text-sm text-muted-foreground border-b border-outline">
										{{ digest.size }}
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</main>

		<!-- Footer -->
		<footer class="fixed bottom-4 right-6 text-sm text-muted-foreground backdrop-blur-sm bg-muted/50 px-3 py-1.5 rounded-lg shadow-sm">
			<span class="text-muted-foreground">v0.5.1</span>
			<span class="mx-1 text-muted-foreground">•</span>
			<a href="#" class="text-primary hover:underline">v0.5.4 available</a>
		</footer>

		<!-- Bulk Delete Tags Dialog -->
		<Dialog v-model="bulkDeleteDialogOpen">
			<DialogTitle>Select Tags to Delete</DialogTitle>

			<p class="text-muted-foreground mb-4">
				Select the tags you want to delete. This action cannot be undone.
			</p>

			<!-- Select All Checkbox -->
			<div class="mb-4 pb-4 border-b border-outline">
				<Checkbox
					id="select-all-tags"
					v-model="selectAllTags"
					:label="`Select All (${filteredTags.length} tags)`"
					label-variant="default"
				/>
			</div>

			<!-- Tags List with Checkboxes -->
			<div class="max-h-96 overflow-y-auto space-y-2 mb-6">
				<div
					v-for="tag in filteredTags"
					:key="tag.name"
					class="border border-outline rounded-lg p-3 hover:bg-muted/50 transition-colors"
				>
					<Checkbox
						:id="`tag-${tag.name}`"
						v-model="selectedTagsForDeletion"
						:value="tag.name"
						label-variant="default"
					>
						<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
							<span class="font-medium text-foreground">{{ tag.name }}</span>
							<span class="text-sm text-muted-foreground">
								{{ tag.digests.length }} image{{ tag.digests.length !== 1 ? 's' : '' }} • {{ calculateTagSize(tag) }}
							</span>
						</div>
					</Checkbox>
				</div>
			</div>

			<div class="flex justify-end gap-3">
				<Button variant="ghost" @click="closeBulkDeleteDialog">
					CANCEL
				</Button>
				<Button
					variant="destructive"
					:disabled="selectedTagsForDeletion.length === 0"
					@click="confirmBulkDelete"
				>
					DELETE
				</Button>
			</div>
		</Dialog>

		<!-- Delete Tag Dialog -->
		<Dialog v-model="deleteTagDialogOpen">
			<DialogTitle>Delete Tag</DialogTitle>

			<p class="text-foreground mb-6">
				Are you sure you want to delete the tag <strong>{{ selectedTag?.name }}</strong>? This action cannot be undone.
			</p>

			<div class="flex justify-end gap-3">
				<Button variant="ghost" @click="deleteTagDialogOpen = false">
					CANCEL
				</Button>
				<Button variant="destructive" @click="confirmDeleteTag">
					DELETE TAG
				</Button>
			</div>
		</Dialog>
	</div>
</template>

<script setup lang="ts">
import type { Tag } from "~/types/repository"
import { computed, ref, watch } from "vue"
import HeaderComponent from "~/components/HeaderComponent.vue"
import {
	Button,
	Checkbox,
	Chip,
	CopyCommand,
	Dialog,
	DialogTitle,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "~/components/ui"
import { useContainerRuntime } from "~/composables/useContainerRuntime"
import { useTagFilterStore } from "~/stores/useTagFilterStore"

// Dialog states
const bulkDeleteDialogOpen = ref(false)
const deleteTagDialogOpen = ref(false)
const selectedTag = ref<Tag | null>(null)
const selectedTagsForDeletion = ref<string[]>([])
const selectAllTags = ref(false)

const architectures = [
	"amd64",
	"386",
	"s390x",
	"arm64",
	"riscv64",
	"arm/v7",
	"ppc64le",
	"arm/v6",
]

// Use Pinia store for tag filtering
const tagFilterStore = useTagFilterStore()

// Use container runtime composable
const { getPullCommand } = useContainerRuntime()

const tags = ref<Tag[]>([
	{
		name: "3.9.4",
		lastUpdated: "3 days ago",
		digests: [
			{ sha: "sha256:a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2", os: "linux", arch: "amd64", size: "149.56 MB" },
			{ sha: "sha256:b2c3d4e5f6a7b2c3d4e5f6a7b2c3d4e5f6a7b2c3d4e5f6a7b2c3d4e5f6a7b2c3", os: "linux", arch: "arm64", size: "142.31 MB" },
			{ sha: "sha256:c3d4e5f6a7b8c3d4e5f6a7b8c3d4e5f6a7b8c3d4e5f6a7b8c3d4e5f6a7b8c3d4", os: "linux", arch: "arm/v7", size: "138.42 MB" },
		],
	},
	{
		name: "3.9.4-debian-12",
		lastUpdated: "4 days ago",
		digests: [
			{ sha: "sha256:f9e8d7c6b5a4f9e8d7c6b5a4f9e8d7c6b5a4f9e8d7c6b5a4f9e8d7c6b5a4f9e8", os: "linux", arch: "amd64", size: "366.21 MB" },
			{ sha: "sha256:e8d7c6b5a4f3e8d7c6b5a4f3e8d7c6b5a4f3e8d7c6b5a4f3e8d7c6b5a4f3e8d7", os: "linux", arch: "arm64", size: "352.89 MB" },
		],
	},
	{
		name: "3.9-debian-12",
		lastUpdated: "4 days ago",
		digests: [
			{ sha: "sha256:3c4d5e6f7a8b3c4d5e6f7a8b3c4d5e6f7a8b3c4d5e6f7a8b3c4d5e6f7a8b3c4d", os: "linux", arch: "amd64", size: "65.02 MB" },
			{ sha: "sha256:4d5e6f7a8b9c4d5e6f7a8b9c4d5e6f7a8b9c4d5e6f7a8b9c4d5e6f7a8b9c4d5e", os: "linux", arch: "arm64", size: "62.18 MB" },
			{ sha: "sha256:5e6f7a8b9c0d5e6f7a8b9c0d5e6f7a8b9c0d5e6f7a8b9c0d5e6f7a8b9c0d5e6f", os: "linux", arch: "arm/v7", size: "59.45 MB" },
			{ sha: "sha256:6f7a8b9c0d1e6f7a8b9c0d1e6f7a8b9c0d1e6f7a8b9c0d1e6f7a8b9c0d1e6f7a", os: "linux", arch: "ppc64le", size: "68.92 MB" },
		],
	},
	{
		name: "3.8.6",
		lastUpdated: "5 days ago",
		digests: [
			{ sha: "sha256:9a8b7c6d5e4f9a8b7c6d5e4f9a8b7c6d5e4f9a8b7c6d5e4f9a8b7c6d5e4f9a8b", os: "linux", arch: "amd64", size: "268.39 MB" },
		],
	},
	{
		name: "latest",
		lastUpdated: "5 days ago",
		digests: [
			{ sha: "sha256:1f2e3d4c5b6a1f2e3d4c5b6a1f2e3d4c5b6a1f2e3d4c5b6a1f2e3d4c5b6a1f2e", os: "linux", arch: "amd64", size: "301.91 MB" },
			{ sha: "sha256:2e3d4c5b6a7f2e3d4c5b6a7f2e3d4c5b6a7f2e3d4c5b6a7f2e3d4c5b6a7f2e3d", os: "linux", arch: "arm64", size: "289.34 MB" },
			{ sha: "sha256:3d4c5b6a7f8e3d4c5b6a7f8e3d4c5b6a7f8e3d4c5b6a7f8e3d4c5b6a7f8e3d4c", os: "linux", arch: "arm/v7", size: "275.67 MB" },
		],
	},
])

const filteredTags = computed(() => {
	if (!tagFilterStore.filterQuery) {
		return tags.value
	}
	return tags.value.filter(tag =>
		tag.name.toLowerCase().includes(tagFilterStore.filterQuery.toLowerCase()),
	)
})

// Watch selectAllTags to select/deselect all
watch(selectAllTags, (newValue) => {
	if (newValue) {
		selectedTagsForDeletion.value = filteredTags.value.map(tag => tag.name)
	}
	else {
		selectedTagsForDeletion.value = []
	}
})

// Watch selectedTagsForDeletion to update selectAllTags
watch(selectedTagsForDeletion, (newValue) => {
	if (newValue.length === filteredTags.value.length && filteredTags.value.length > 0) {
		selectAllTags.value = true
	}
	else {
		selectAllTags.value = false
	}
})

// Calculate total size for a tag
function calculateTagSize(tag: Tag): string {
	// For demo purposes, return the first digest size
	// In a real app, you might sum all digest sizes
	return tag.digests[0]?.size || "0 B"
}

// Delete dialog handlers
function openBulkDeleteDialog() {
	selectedTagsForDeletion.value = []
	selectAllTags.value = false
	bulkDeleteDialogOpen.value = true
}

function closeBulkDeleteDialog() {
	bulkDeleteDialogOpen.value = false
	selectedTagsForDeletion.value = []
	selectAllTags.value = false
}

function confirmBulkDelete() {
	// TODO: Implement actual bulk tag deletion
	// This would call an API endpoint to delete multiple tags
	// For now, just close the dialog
	closeBulkDeleteDialog()
}

function openDeleteTagDialog(tag: Tag) {
	selectedTag.value = tag
	deleteTagDialogOpen.value = true
}

function confirmDeleteTag() {
	if (!selectedTag.value)
		return

	// TODO: Implement actual tag deletion
	// This would call an API endpoint to delete the specific tag
	deleteTagDialogOpen.value = false
	selectedTag.value = null
}
</script>
