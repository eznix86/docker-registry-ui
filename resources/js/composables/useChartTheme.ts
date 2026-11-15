import { onBeforeUnmount, onMounted, ref } from "vue"

interface ChartTheme {
	primary: string
	accent: string
	info: string
	success: string
	warning: string
	outline: string
	mutedForeground: string
	foreground: string
	background: string
	palette: string[]
}

const fallbackTheme: ChartTheme = {
	primary: "#1d63ed",
	accent: "#0047c2",
	info: "#1d63ed",
	success: "#2e7d32",
	warning: "#f57c00",
	outline: "#d0d7de",
	mutedForeground: "#57606a",
	foreground: "#24292f",
	background: "#ffffff",
	palette: ["#1d63ed", "#0047c2", "#1d63ed", "#2e7d32", "#f57c00"],
}

export function useChartTheme() {
	const theme = ref<ChartTheme>(fallbackTheme)
	let observer: MutationObserver | undefined

	function readVar(name: string, fallback: string) {
		if (typeof window === "undefined") {
			return fallback
		}

		const sources = [document.documentElement, document.body].filter(Boolean) as HTMLElement[]
		for (const source of sources) {
			const value = getComputedStyle(source).getPropertyValue(name).trim()
			if (value) {
				return value
			}
		}

		return fallback
	}

	function refreshTheme() {
		const primary = readVar("--color-primary", fallbackTheme.primary)
		const accent = readVar("--color-accent", fallbackTheme.accent)
		const info = readVar("--color-info", fallbackTheme.info)
		const success = readVar("--color-success", fallbackTheme.success)
		const warning = readVar("--color-warning", fallbackTheme.warning)
		const outline = readVar("--color-outline", fallbackTheme.outline)
		const mutedForeground = readVar("--color-muted-foreground", fallbackTheme.mutedForeground)
		const foreground = readVar("--color-foreground", fallbackTheme.foreground)
		const background = readVar("--color-background", fallbackTheme.background)

		theme.value = {
			primary,
			accent,
			info,
			success,
			warning,
			outline,
			mutedForeground,
			foreground,
			background,
			palette: [primary, accent, info, success, warning],
		}
	}

	onMounted(() => {
		refreshTheme()
		observer = new MutationObserver(() => refreshTheme())
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["data-theme", "style", "class"],
		})
		if (document.body) {
			observer.observe(document.body, {
				attributes: true,
				attributeFilter: ["data-theme", "style", "class"],
			})
		}
	})

	onBeforeUnmount(() => {
		observer?.disconnect()
	})

	return theme
}
