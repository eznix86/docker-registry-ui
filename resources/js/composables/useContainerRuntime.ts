// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { ref, watch } from "vue"

export type ContainerRuntime
	= | "docker"
		| "podman"
		| "nerdctl"
		| "buildah"
		| "skopeo"
		| "crictl"
		| "none"

export interface RuntimeOption {
	value: ContainerRuntime
	label: string
	command: string
}

export const RUNTIME_OPTIONS: RuntimeOption[] = [
	{ value: "docker", label: "Docker", command: "docker pull" },
	{ value: "podman", label: "Podman", command: "podman pull" },
	{ value: "nerdctl", label: "Nerdctl", command: "nerdctl pull" },
	{ value: "buildah", label: "Buildah", command: "buildah pull" },
	{ value: "skopeo", label: "Skopeo", command: "skopeo copy docker://" },
	{ value: "crictl", label: "Crictl", command: "crictl pull" },
	{ value: "none", label: "None (image reference only)", command: "" },
]

const STORAGE_KEY = "containerhub-runtime"

// Global reactive runtime state
const currentRuntime = ref<ContainerRuntime>(
	(localStorage.getItem(STORAGE_KEY) as ContainerRuntime) || "docker",
)

// Apply runtime to document
function applyRuntime(runtime: ContainerRuntime) {
	document.documentElement.setAttribute("data-runtime", runtime)
}

// Initialize runtime on first load
applyRuntime(currentRuntime.value)

// Watch for runtime changes and persist to localStorage
watch(currentRuntime, (newRuntime) => {
	applyRuntime(newRuntime)
	localStorage.setItem(STORAGE_KEY, newRuntime)
})

export function useContainerRuntime() {
	const setRuntime = (runtime: ContainerRuntime) => {
		currentRuntime.value = runtime
	}

	const getRuntimeLabel = (runtime: ContainerRuntime): string => {
		return RUNTIME_OPTIONS.find(r => r.value === runtime)?.label || runtime
	}

	const getRuntimeCommand = (runtime: ContainerRuntime): string => {
		const option = RUNTIME_OPTIONS.find(r => r.value === runtime)
		return option !== undefined ? option.command : "docker pull"
	}

	const getPullCommand = (
		registry: string,
		repository: string,
		tag: string,
	): string => {
		const command = getRuntimeCommand(currentRuntime.value)
		const imageRef = `${registry}/${repository}:${tag}`
		return command ? `${command} ${imageRef}` : imageRef
	}

	return {
		currentRuntime,
		setRuntime,
		getRuntimeLabel,
		getRuntimeCommand,
		getPullCommand,
		runtimeOptions: RUNTIME_OPTIONS,
	}
}
