// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import type { PageProps } from "@inertiajs/core"

export interface Repository {
	name: string
	namespace: string
	registry: string
	tagsCount: number
	architectures?: string[]
	totalSizeInBytes?: number
}

export interface Registry {
	name: string
	host: string
	status: number
}

export interface ExploreFilters {
	registries: string[]
	architectures: string[]
	showUntagged: boolean
	search: string
}

export type ExploreProps = PageProps & {
	repositories?: Repository[]
	registries?: Registry[]
	totalRepositories?: number
	architectures?: string[]
	filters?: ExploreFilters
}

export interface Image {
	digest: string
	createdAt: Date
	os: string
	architecture: string
	variant: string
	size: number
}

export interface Tag {
	name: string
	digest: string
	createdAt: string
	images: Image[]
	alias: string[]
}

export interface RepositoryFilters {
	sortBy: "newest" | "oldest" | "name" | "size"
	filter: string
}

export interface TagScroll {
	data: Tag[]
}

export type RepositoryProps = PageProps & {
	repository?: Repository
	tags?: TagScroll
	filters?: RepositoryFilters
}
