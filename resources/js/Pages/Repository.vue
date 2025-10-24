<template>
	<div class="h-screen bg-background text-foreground flex flex-col">
		<HeaderComponent />

		<main class="flex-1 p-4 sm:p-6 overflow-y-auto">
			<!-- Breadcrumb Navigation -->
			<nav class="mb-4 sm:mb-6">
				<ol class="flex flex-wrap items-center gap-2 text-xs sm:text-sm md:text-base text-muted-foreground">
					<li>
						<Link href="/" class="text-primary hover:underline">
							Explore
						</Link>
					</li>
					<li>/</li>
					<li class="opacity-60">
						{{ registryHost }}
					</li>
					<li>/</li>
					<li>{{ repositoryName }}</li>
				</ol>
			</nav>

			<!-- Repository Header -->
			<div class="flex items-start justify-between gap-4 mb-4">
				<h1 class="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight lg:leading-[56.7px] text-foreground break-words min-w-0">
					{{ repositoryName }}
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
						<span class="font-bold text-foreground">{{ tagsCount }}</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-muted-foreground">Total size</span>
						<span class="font-bold text-foreground">{{ formatBytes(totalSizeInBytes) }}</span>
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
					<span><strong class="font-bold">{{ tagsCount }}</strong> tags available</span>
					<span>Total size: <strong class="font-bold">{{ formatBytes(totalSizeInBytes) }}</strong></span>
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
						<Select :model-value="sortByDisplay" aria-labelledby="sort-by-label" @update:model-value="handleSortChange">
							<SelectTrigger aria-labelledby="sort-by-label">
								{{ sortByDisplay }}
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="Newest" label="Newest" />
								<SelectItem value="Oldest" label="Oldest" />
								<SelectItem value="Name" label="Name" />
								<SelectItem value="Size" label="Size" />
							</SelectContent>
						</Select>
					</div>

					<div class="relative w-full sm:w-64">
						<svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
						</svg>
						<input
							id="filter-tags-input"
							v-model="localFilterQuery"
							type="text"
							placeholder="Filter tags"
							aria-label="Filter tags"
							class="w-full pl-10 pr-3.5 py-[7.5px] border border-field rounded-lg focus:outline-none focus:ring-2 focus:ring-focus focus:border-transparent text-sm leading-[23px]"
							@input="handleFilterInput"
						>
					</div>
				</div>

				<span class="text-muted-foreground text-sm">{{ filteredTags.length }} of {{ tags.length }} tags</span>
			</div>

			<!-- Tags List -->
			<InfiniteScroll data="tags" class="space-y-6">
				<div v-for="tag in filteredTags" :key="tag.name" class="border border-outline rounded-lg bg-card p-4 sm:p-6">
					<!-- Tag Header -->
					<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4">
						<div class="flex items-center justify-between sm:justify-start gap-3 sm:gap-4">
							<div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 min-w-0">
								<h2 class="text-lg font-semibold leading-7 text-primary">
									{{ tag.name }}
								</h2>
								<span class="text-sm text-muted-foreground">Last updated {{ formatRelativeTime(tag.createdAt) }}</span>
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
							:command="getPullCommand(registryHost, repositoryName, tag.name)"
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
								<tr v-for="(image, idx) in tag.images" :key="idx" class="hover:bg-muted transition-colors">
									<td class="py-1.5 px-4 text-sm text-primary border-b border-outline">
										{{ image.digest.substring(0, 19) }}
									</td>
									<td class="py-1.5 px-4 text-sm text-muted-foreground border-b border-outline">
										{{ image.os }}/{{ image.architecture }}{{ image.variant ? `/${image.variant}` : '' }}
									</td>
									<td class="py-1.5 px-4 text-sm text-muted-foreground border-b border-outline">
										{{ formatBytes(image.size) }}
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
			</InfiniteScroll>
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
								{{ tag.images.length }} image{{ tag.images.length !== 1 ? 's' : '' }} • {{ calculateTagSize(tag) }}
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
import type { RepositoryProps, Tag } from "~/types"
import { InfiniteScroll, Link, usePage } from "@inertiajs/vue3"
import { useDebounceFn, useTimeAgo } from "@vueuse/core"
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
import { useAppPreferencesStore } from "~/stores/useAppPreferencesStore"
import { useRepositoryFilterStore } from "~/stores/useRepositoryFilterStore"

// Get Inertia page props
const page = usePage<RepositoryProps>()
const repositoryStore = useRepositoryFilterStore()
const preferencesStore = useAppPreferencesStore()

// Computed values from Inertia props
const repository = computed(() => page.props.repository)
const tags = computed(() => page.props.tags?.data || [])
const architectures = computed(() => page.props.repository?.architectures || [])
const totalSizeInBytes = computed(() => page.props.repository?.totalSizeInBytes || 0)
const tagsCount = computed(() => page.props.repository?.tagsCount || 0)

// Repository name for URL building
const repositoryName = computed(() => {
	const repo = repository.value
	if (!repo)
		return ""
	if (repo.namespace && repo.namespace !== repo.name) {
		return `${repo.namespace}/${repo.name}`
	}
	return repo.name
})

const registryHost = computed(() => repository.value?.registry || "")

// Current page URL (without query params)
const currentUrl = computed(() => page.url.split("?")[0])

// Sync filters from Inertia props
watch(
	() => page.props.filters,
	(filters) => {
		if (filters) {
			repositoryStore.setFilters(filters)
			repositoryStore.setLocalFilter(filters.filter)
		}
	},
	{ immediate: true },
)

// Dialog states
const bulkDeleteDialogOpen = ref(false)
const deleteTagDialogOpen = ref(false)
const selectedTag = ref<Tag | null>(null)
const selectedTagsForDeletion = ref<string[]>([])
const selectAllTags = ref(false)

// Pull command helper from preferences store
function getPullCommand(registry: string, repo: string, tag: string): string {
	return preferencesStore.getPullCommand(registry, repo, tag)
}

// Local filter for immediate UI updates
const localFilterQuery = ref(repositoryStore.localFilter)

watch(() => repositoryStore.localFilter, (newValue) => {
	localFilterQuery.value = newValue
})

// Filter tags based on local filter query
const filteredTags = computed(() => {
	if (!localFilterQuery.value) {
		return tags.value
	}
	return tags.value.filter(tag =>
		tag.name.toLowerCase().includes(localFilterQuery.value.toLowerCase()),
	)
})

// Format bytes to human readable string
function formatBytes(bytes: number): string {
	if (bytes === 0)
		return "0 B"
	const k = 1024
	const sizes = ["B", "KB", "MB", "GB", "TB"]
	const i = Math.floor(Math.log(bytes) / Math.log(k))
	return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`
}

// Format date to relative time using VueUse
function formatRelativeTime(dateString: string): string {
	return useTimeAgo(dateString).value
}

// Calculate total size for a tag
function calculateTagSize(tag: Tag): string {
	const totalBytes = tag.images.reduce((sum, img) => sum + img.size, 0)
	return formatBytes(totalBytes)
}

// Sort by mapping
const sortByDisplay = computed(() => {
	const sortBy = repositoryStore.filters.sortBy
	if (sortBy === "newest")
		return "Newest"
	if (sortBy === "oldest")
		return "Oldest"
	if (sortBy === "name")
		return "Name"
	if (sortBy === "size")
		return "Size"
	return "Newest"
})

// Debounced filter request
const debouncedFilterRequest = useDebounceFn(() => {
	repositoryStore.setFilter(localFilterQuery.value, currentUrl.value)
}, 300)

// Handle sort change
function handleSortChange(value: string) {
	const sortByValue = value.toLowerCase() as "newest" | "oldest" | "name" | "size"
	repositoryStore.setSortBy(sortByValue, currentUrl.value)
}

// Handle filter input
function handleFilterInput() {
	// Update local state immediately for responsive UI
	repositoryStore.setLocalFilter(localFilterQuery.value)
	// Debounce the actual request
	debouncedFilterRequest()
}

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
