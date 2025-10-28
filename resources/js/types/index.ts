// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025  Bruno Bernard
//
// This file is part of Docker Registry UI (Container Hub).
//
// Docker Registry UI is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
//
// Docker Registry UI is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.

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
