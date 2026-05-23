
export interface RepositoryPathInput {
	name: string
	namespace: string
	registryHost?: string
}

export function encodeRouteSegment(value: string): string {
	return value.replaceAll(":", "~")
}

export function registryPath(host: string): string {
	return `/r/${encodeRouteSegment(host)}`
}

export function repositoryPath(
	repository: RepositoryPathInput,
	fallbackHost = "",
): string {
	const host = repository.registryHost || fallbackHost

	if (!host.trim()) {
		return "#"
	}

	const segments = [registryPath(host)]

	if (repository.namespace.trim()) {
		segments.push(repository.namespace)
	}

	segments.push(encodeURIComponent(repository.name))

	return segments.join("/")
}

export function currentPath(): string {
	return window.location.pathname
}

export function currentTagsPath(): string {
	return `${currentPath()}/tags`
}
