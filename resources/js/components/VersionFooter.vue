<template>
	<footer class="fixed bottom-4 right-6 text-sm text-muted-foreground backdrop-blur-sm bg-muted/50 px-3 py-1.5 rounded-lg shadow-sm">
		<span class="text-muted-foreground">{{ currentVersion }}</span>
		<template v-if="latestVersion && latestVersion !== currentVersion">
			<span class="mx-1 text-muted-foreground">•</span>
			<a :href="updateUrl" class="text-primary hover:underline">
				{{ latestVersion }} available
			</a>
		</template>
	</footer>
</template>

<script setup lang="ts">
interface VersionFooterProps {
	currentVersion: string
	latestVersion?: string
	updateUrl?: string
}

withDefaults(defineProps<VersionFooterProps>(), {
	latestVersion: undefined,
	updateUrl: "#",
})
</script>
