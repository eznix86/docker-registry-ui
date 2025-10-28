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
