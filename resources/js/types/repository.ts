// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

export interface Repository {
	name: string
	architectures: string[]
	size: string
	registry: string
	isUntagged?: boolean
}

export interface Tag {
	name: string
	lastUpdated: string
	digests: TagDigest[]
}

export interface TagDigest {
	sha: string
	os: string
	arch: string
	size: string
}

export interface Digest {
	digest: string
	architecture: string
	os: string
}
