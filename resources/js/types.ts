// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

export type Repository = {
	name: string;
	namespace: string;
	registry: string;
	tagsCount: number;
	architectures?: string[];
	totalSizeInBytes?: number;
};

export type Registry = {
	name: string;
	host: string;
	status: number;
};

export type ExploreFilters = {
	registries: string[];
	architectures: string[];
	showUntagged: boolean;
	search: string;
};

export type ExploreProps = {
	repositories?: Repository[];
	registries?: Registry[];
	totalRepositories?: number;
	architectures?: string[];
	filters?: ExploreFilters;
};

export type Image = {
	digest: string;
	createdAt: Date;
	os: string;
	architecture: string;
	variant: string;
	size: number;
};

export type Tag = {
	name: string;
	digest: string;
	createdAt: string;
	images: Image[];
	alias: string[];
};

export type RepositoryFilters = {
	sortBy: "newest" | "oldest" | "name" | "size";
	filter: string;
};

export type TagScroll = {
	data: Tag[];
};

export type RepositoryProps = {
	repository?: Repository;
	tags?: TagScroll;
	filters?: RepositoryFilters;
};
