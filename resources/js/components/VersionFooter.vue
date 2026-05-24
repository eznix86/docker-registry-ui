<template>
	<footer class="fixed bottom-4 right-6 text-sm text-muted-foreground backdrop-blur-sm bg-muted/50 px-3 py-1.5 rounded-lg shadow-sm">
		<span class="text-muted-foreground">{{ displayCurrentVersion }}</span>
		<template v-if="resolvedLatestVersion && hasNewerRelease">
			<span class="mx-1 text-muted-foreground">•</span>
			<a :href="resolvedUpdateURL" class="text-primary hover:underline" target="_blank" rel="noreferrer">
				{{ resolvedLatestVersion }} available
			</a>
		</template>
	</footer>
</template>

<script setup lang="ts">
import type { SharedProps } from "~/types"
import { gt, valid } from "semver"
import { computed, onMounted, ref } from "vue"

interface VersionFooterProps {
	currentVersion?: string
	latestVersion?: string
	updateUrl?: string
	shared?: SharedProps
}

const props = withDefaults(defineProps<VersionFooterProps>(), {
	currentVersion: undefined,
	latestVersion: undefined,
	updateUrl: undefined,
	shared: undefined,
})

const defaultUpdateURL = "https://github.com/eznix86/docker-registry-ui/releases/latest"

interface ReleaseInfo {
	version: string
	url: string
}

let cachedRelease: ReleaseInfo = {
	version: "",
	url: defaultUpdateURL,
}

let releaseRequest: Promise<ReleaseInfo | null> | null = null

const releaseVersion = ref(cachedRelease.version)
const releaseURL = ref(cachedRelease.url)

const resolvedCurrentVersion = computed(() => props.currentVersion || props.shared?.appVersion || "dev")
const displayCurrentVersion = computed(() => formatVersion(resolvedCurrentVersion.value))
const resolvedLatestVersion = computed(() => props.latestVersion || releaseVersion.value)
const resolvedUpdateURL = computed(() => props.updateUrl || releaseURL.value || defaultUpdateURL)
const hasNewerRelease = computed(() => {
	const currentVersion = normalizeSemver(resolvedCurrentVersion.value)
	const latestVersion = normalizeSemver(resolvedLatestVersion.value)

	if (!currentVersion || !latestVersion) {
		return false
	}

	return gt(latestVersion, currentVersion)
})

onMounted(async () => {
	if (props.latestVersion && props.updateUrl) {
		return
	}

	if (cachedRelease.version && cachedRelease.url) {
		return
	}

	if (!releaseRequest) {
		releaseRequest = fetchLatestRelease()
	}

	const release = await releaseRequest
	if (!release) {
		return
	}

	cachedRelease = release
	releaseVersion.value = release.version
	releaseURL.value = release.url
	if (releaseRequest) {
		releaseRequest = null
	}
})

async function fetchLatestRelease(): Promise<ReleaseInfo | null> {
	try {
		const response = await fetch("https://api.github.com/repos/eznix86/docker-registry-ui/releases/latest", {
			headers: {
				Accept: "application/vnd.github+json",
			},
		})

		if (!response.ok) {
			return null
		}

		const data = await response.json() as { tag_name?: string, html_url?: string }
		if (!data.tag_name) {
			return null
		}

		return {
			version: data.tag_name,
			url: data.html_url || defaultUpdateURL,
		}
	}
	catch {
		return null
	}
	finally {
		releaseRequest = null
	}
}

function normalizeSemver(version: string | undefined): string | null {
	if (!version) {
		return null
	}

	const normalizedVersion = version.startsWith("v") ? version.slice(1) : version
	return valid(normalizedVersion)
}

function formatVersion(version: string | undefined): string {
	if (!version) {
		return "dev"
	}

	if (version === "dev") {
		return version
	}

	return version.startsWith("v") ? version : `v${version}`
}
</script>
