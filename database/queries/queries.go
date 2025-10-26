// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

package queries

import _ "embed"

// RefreshRepositoryStatsSQL is the full refresh query for repository_stats cache table
//
//go:embed refresh_repository_stats.sql
var RefreshRepositoryStatsSQL string

// RefreshTagDetailsSQL is the full refresh query for tag_details cache table
//
//go:embed refresh_tag_details.sql
var RefreshTagDetailsSQL string

// RefreshDirtyRepositoriesSQL is the incremental refresh query for dirty repositories only
//
//go:embed refresh_dirty_repositories.sql
var RefreshDirtyRepositoriesSQL string

// RefreshDirtyTagsSQL is the incremental refresh query for dirty tags only
//
//go:embed refresh_dirty_tags.sql
var RefreshDirtyTagsSQL string
