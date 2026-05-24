import type { PageProps } from "@inertiajs/core"

// Shared global props available on all pages
export interface SharedProps extends PageProps {
	[key: string]: unknown
	disableTagDeletion: boolean
	appVersion: string
}

export interface Repository {
	id?: number
	name: string
	namespace: string
	registry: string
	registryHost: string
	tagsCount: number
	architectures?: string[]
	totalSizeInBytes?: number
}

export interface Registry {
	name?: string
	host: string
	status: number
}

export interface RegistryStats {
	repositoryCount: number
	tagCount: number
	estimatedStorageBytes: number
	architectureCount: number
}

export interface NamespaceStorage {
	namespace: string
	displayName: string
	totalSizeBytes: number
}

export interface ArchitectureCoverage {
	architecture: string
	repositoryCount: number
}

export interface RegistryRepositoryRow {
	id: number
	name: string
	namespace: string
	displayName: string
	tagsCount: number
	totalSizeInBytes: number
}

export interface RegistryStorageUsage {
	registryHost: string
	displayName: string
	totalSizeBytes: number
}

export interface ExploreFilters {
	registries: string[]
	architectures: string[]
	showUntagged: boolean
	search: string
}

export type ExploreProps = PageProps & SharedProps & {
	repositories: Repository[]
	registries: Registry[]
	totalRepositories: number
	architectures: string[]
	filters: ExploreFilters
	showUsageBar?: boolean
	charts?: {
		storageByRegistry: RegistryStorageUsage[]
	}
}

export interface Image {
	digest: string
	createdAt: Date
	os: string
	architecture: string
	variant: string
	size: number
	stub?: boolean
}

export interface Tag {
	name: string
	digest: string
	createdAt: string
	images: Image[]
	alias: string[]
	metadataAvailable: boolean
	kind?: string
	chartName?: string
	chartVersion?: string
	chartDesc?: string
}

export interface RepositoryFilters {
	sortBy: "newest" | "oldest" | "name-asc" | "name-desc" | "size-asc" | "size-desc"
	filter: string
}

export interface TagScroll {
	data: Tag[]
}

export type RepositoryProps = PageProps & SharedProps & {
	repository: Repository
	tags: TagScroll
	bulkDeleteTags?: Tag[]
	filters: RepositoryFilters
}

export type RegistryPageProps = PageProps & SharedProps & {
	registry: Registry
	registries: Registry[]
	stats: RegistryStats
	charts?: {
		storageByNamespace: NamespaceStorage[]
		architectureCoverage: ArchitectureCoverage[]
	}
	repositories: RegistryRepositoryRow[]
}
