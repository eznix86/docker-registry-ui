


<template>
	<button
		v-ripple
		class="w-12 h-12 p-3 hover:bg-white/10 rounded-full transition-colors inline-flex items-center justify-center"
		:class="{ 'pointer-events-none': syncStore.isLoading }"
		aria-label="Refresh repositories"
		title="Refresh repositories"
		@click="handleRefresh"
	>
		<svg
			v-if="!syncStore.isLoading"
			class="w-6 h-6 text-white"
			fill="currentColor"
			viewBox="0 0 24 24"
			aria-hidden="true"
		>
			<path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
		</svg>
		<svg
			v-else
			class="spinner w-6 h-6"
			viewBox="0 0 100 100"
			xmlns="http://www.w3.org/2000/svg"
		>
			<circle cx="50" cy="50" r="47" stroke="white" fill="none" />
		</svg>
	</button>
</template>

<script setup lang="ts">
import { useSyncProgressStore } from "~/stores/useSyncProgressStore"

const syncStore = useSyncProgressStore()

async function handleRefresh() {
	syncStore.isRefreshing = true

	try {
		const response = await fetch("/api/sync/trigger", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
		})

		if (!response.ok) {
			syncStore.isRefreshing = false
		}
	}
	catch (error) {
		console.error("Error triggering manual sync:", error)
		syncStore.isRefreshing = false
	}
}
</script>

<style scoped>
.spinner circle {
	--r: 47px;
	--1deg: calc(2 * 3.14159 * var(--r) / 360);

	stroke-width: calc((50% - var(--r)) * 2);

	animation: dash-anim 1400ms ease-in-out infinite, full-rotation-anim 2000ms linear infinite;
	transform-origin: 50% 50%;
}

@keyframes dash-anim {
	0% {
		stroke-dasharray: 0
			0
			calc(2 * var(--1deg))
			calc(358 * var(--1deg));
	}
	50% {
		stroke-dasharray: 0
			calc(35 * var(--1deg))
			calc(290 * var(--1deg))
			calc(35 * var(--1deg));
	}
	100% {
		stroke-dasharray: 0
			calc(358 * var(--1deg))
			calc(2 * var(--1deg));
	}
}

@keyframes full-rotation-anim {
	0% {
		transform: rotate(0deg);
	}
	100% {
		transform: rotate(360deg);
	}
}
</style>
