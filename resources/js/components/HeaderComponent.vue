<template>
	<header class="bg-linear-to-r from-primary to-accent flex items-center justify-between shadow-md h-16">
		<div class="flex items-center flex-1 md:pl-6 pl-4">
			<a
				v-ripple
				href="/"
				class="w-12 h-12 p-3 hover:bg-primary-foreground/10 rounded-full transition-colors inline-flex items-center justify-center md:-ml-3 -ml-2 mr-4"
				aria-label="ContainerHub home"
				title="Go to home"
			>
				<svg class="w-6 h-6 text-primary-foreground" viewBox="0 0 240 130" aria-hidden="true">
					<path fill="currentColor" stroke="currentColor" stroke-width="38" d="m198 111h42m-92 0h42m-91 0h42m-91 0h41m-91 0h42m8-46h41m8 0h42m7 0h42m-42-46h42" />
				</svg>
			</a>

			<span class="text-xl font-black text-primary-foreground hidden lg:inline">ContainerHub</span>

			<div class="flex-1 max-w-xl relative mx-auto" role="search">
				<div class="relative flex items-center">
					<svg class="absolute left-4 w-4 h-4 text-primary-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
					</svg>
					<input
						ref="searchInput"
						v-model="searchValue"
						type="search"
						placeholder="Search repositories..."
						aria-label="Search repositories"
						class="w-full bg-primary-foreground/10 text-primary-foreground placeholder-primary-foreground/50 pl-12 pr-3 sm:pr-14 py-2 text-sm sm:text-base rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-foreground/30 focus:bg-primary-foreground/15 transition-colors [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
					>
					<span class="absolute right-3 text-xs bg-primary-foreground/15 px-2 py-1 rounded text-primary-foreground/50 hidden sm:inline">⌘K</span>
				</div>
			</div>
		</div>

		<RefreshButton class="mr-6" />
	</header>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue"
import { router, usePage } from "@inertiajs/vue3"
import { useDebounceFn } from "@vueuse/core"
import RefreshButton from "~/components/RefreshButton.vue"
import { buildFilterParams } from "~/lib/filterParams"

const page = usePage<{ props: { filters?: { search?: string } } }>()
const searchValue = ref(((page.props.filters as any)?.search) || "")
const searchInput = ref<HTMLInputElement | null>(null)

watch(() => (page.props.filters as any)?.search, (v) => { searchValue.value = v || "" })
watch(searchValue, (v) => {
	if (v === (((page.props.filters as any)?.search) || "")) {
		return
	}

	doSearch()
})

function handleKeydown(e: KeyboardEvent) {
	if ((e.metaKey || e.ctrlKey) && e.key === "k") {
		e.preventDefault()
		searchInput.value?.focus()
	}
}

onMounted(() => document.addEventListener("keydown", handleKeydown))
onUnmounted(() => document.removeEventListener("keydown", handleKeydown))

const doSearch = useDebounceFn(() => {
	const params = buildFilterParams({ search: searchValue.value || undefined })
	router.get("/?" + params.toString(), {}, {
		preserveScroll: true, preserveState: true, replace: true,
		only: ["repositories", "totalRepositories", "filters"],
	})
}, 300)
</script>
