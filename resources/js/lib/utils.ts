import type { Repository } from "~/types"

import { tv } from "tailwind-variants"

// Export cn from tailwind-variants for simple class merging
export { cn } from "tailwind-variants"

// Export tv for creating variant-based components
export { tv }

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
	if (bytes === 0)
		return "0 B"
	const k = 1024
	const sizes = ["B", "KB", "MB", "GB", "TB"]
	const i = Math.floor(Math.log(bytes) / Math.log(k))
	return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`
}

export function repositoryName(repository: Repository): string {
	if (repository.namespace) {
		return `${repository.namespace}/${repository.name}`
	}
	return repository.name
}

export function formatRegistryName(label: string): string {
	if (label.includes(".")) {
		return label
	}

	return label
		.replaceAll("_", " ")
		.split(" ")
		.filter(Boolean)
		.map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
		.join(" ")
}
