import { useLocalStorage } from "@vueuse/core"
import { computed, ref, watch } from "vue"

export type Theme = "the-hub-light" | "the-hub-dark" | "monokai" | "nord-dark" | "nord-light" | "one-dark" | "tokyo-night" | "cyberpunk" | "github-dark" | "github-light" | "catppuccin-mocha" | "catppuccin-latte"

export type FontSans = "roboto" | "inter" | "instrument-sans" | "jetbrains-sans" | "geist" | "nacelle" | "ibm-plex-sans" | "space-grotesk" | "dm-sans" | "onest"

export type FontMono = "roboto-mono" | "jetbrains-mono" | "geist-mono" | "fira-code" | "cascadia-code" | "source-code-pro" | "inconsolata" | "courier-prime"

export type ContainerRuntime = "docker" | "podman" | "nerdctl" | "buildah" | "skopeo" | "crictl" | "none"

export interface ThemeOption { value: Theme, label: string }
export interface FontOption { value: string, label: string, family: string }
export interface RuntimeOption { value: ContainerRuntime, label: string, command: string }

export const THEME_OPTIONS: ThemeOption[] = [
	{ value: "the-hub-dark", label: "The Hub Dark" },
	{ value: "the-hub-light", label: "The Hub Light" },
	{ value: "monokai", label: "Monokai" },
	{ value: "nord-dark", label: "Nord Dark" },
	{ value: "nord-light", label: "Nord Light" },
	{ value: "one-dark", label: "One Dark" },
	{ value: "tokyo-night", label: "Tokyo Night" },
	{ value: "cyberpunk", label: "Cyberpunk" },
	{ value: "github-dark", label: "GitHub Dark" },
	{ value: "github-light", label: "GitHub Light" },
	{ value: "catppuccin-mocha", label: "Catppuccin Mocha" },
	{ value: "catppuccin-latte", label: "Catppuccin Latte" },
]

export const FONT_SANS_OPTIONS: FontOption[] = [
	{ value: "roboto", label: "Roboto", family: "Roboto, sans-serif" },
	{ value: "inter", label: "Inter", family: "Inter, sans-serif" },
	{ value: "instrument-sans", label: "Instrument Sans", family: "\"Instrument Sans\", system-ui, sans-serif" },
	{ value: "jetbrains-sans", label: "JetBrains Sans", family: "\"JetBrains Sans\", sans-serif" },
	{ value: "geist", label: "Geist", family: "\"Geist\", sans-serif" },
	{ value: "nacelle", label: "Nacelle", family: "\"Nacelle\", sans-serif" },
	{ value: "ibm-plex-sans", label: "IBM Plex Sans", family: "\"IBM Plex Sans\", sans-serif" },
	{ value: "space-grotesk", label: "Space Grotesk", family: "\"Space Grotesk\", sans-serif" },
	{ value: "dm-sans", label: "DM Sans", family: "\"DM Sans\", sans-serif" },
	{ value: "onest", label: "Onest", family: "\"Onest\", sans-serif" },
]

export const FONT_MONO_OPTIONS: FontOption[] = [
	{ value: "roboto-mono", label: "Roboto Mono", family: "\"Roboto Mono\", monospace" },
	{ value: "jetbrains-mono", label: "JetBrains Mono", family: "\"JetBrains Mono\", monospace" },
	{ value: "geist-mono", label: "Geist Mono", family: "\"Geist Mono\", monospace" },
	{ value: "fira-code", label: "Fira Code", family: "\"Fira Code\", monospace" },
	{ value: "cascadia-code", label: "Cascadia Code", family: "\"Cascadia Code\", monospace" },
	{ value: "source-code-pro", label: "Source Code Pro", family: "\"Source Code Pro\", monospace" },
	{ value: "inconsolata", label: "Inconsolata", family: "\"Inconsolata\", monospace" },
	{ value: "courier-prime", label: "Courier Prime", family: "\"Courier Prime\", monospace" },
]

export const RUNTIME_OPTIONS: RuntimeOption[] = [
	{ value: "docker", label: "Docker", command: "docker pull" },
	{ value: "podman", label: "Podman", command: "podman pull" },
	{ value: "nerdctl", label: "Nerdctl", command: "nerdctl pull" },
	{ value: "buildah", label: "Buildah", command: "buildah pull" },
	{ value: "skopeo", label: "Skopeo", command: "skopeo copy docker://" },
	{ value: "crictl", label: "Crictl", command: "crictl pull" },
	{ value: "none", label: "None (image reference only)", command: "" },
]

export const isSettingsOpen = ref(false)

export function usePreferences() {
	const theme = useLocalStorage<Theme>("containerhub-theme", "the-hub-light")
	const fontSans = useLocalStorage<FontSans>("containerhub-font-sans", "roboto")
	const fontMono = useLocalStorage<FontMono>("containerhub-font-mono", "roboto-mono")
	const containerRuntime = useLocalStorage<ContainerRuntime>("containerhub-runtime", "docker")

	applyTheme(theme.value)
	applyFonts(fontSans.value, fontMono.value)
	applyRuntime(containerRuntime.value)

	watch(theme, newTheme => applyTheme(newTheme))
	watch([fontSans, fontMono], ([newSans, newMono]) => applyFonts(newSans, newMono))
	watch(containerRuntime, newRuntime => applyRuntime(newRuntime))

	const runtimeCommand = computed(() => {
		return RUNTIME_OPTIONS.find(r => r.value === containerRuntime.value)?.command || "docker pull"
	})

	function getPullCommand(registry: string, repository: string, tag: string): string {
		const cmd = runtimeCommand.value
		const ref = `${registry}/${repository}:${tag}`
		return cmd ? `${cmd} ${ref}` : ref
	}

	return {
		theme,
		fontSans,
		fontMono,
		containerRuntime,
		runtimeCommand,
		getPullCommand,
	}
}

function applyTheme(t: Theme) {
	document.documentElement.setAttribute("data-theme", t)
}

function applyFonts(sans: FontSans, mono: FontMono) {
	document.documentElement.setAttribute("data-font-sans", sans)
	document.documentElement.setAttribute("data-font-mono", mono)
}

function applyRuntime(r: ContainerRuntime) {
	document.documentElement.setAttribute("data-runtime", r)
}
