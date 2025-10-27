// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

package assets

import "embed"

//go:embed all:public resources/views/app.html
var PublicFS embed.FS

//go:embed database/migrations/*.sql
var MigrationsFS embed.FS

// RefreshRepositoryStatsSQL is the full refresh query for repository_stats cache table
//
//go:embed database/queries/refresh_repository_stats.sql
var RefreshRepositoryStatsSQL string

// RefreshTagDetailsSQL is the full refresh query for tag_details cache table
//
//go:embed database/queries/refresh_tag_details.sql
var RefreshTagDetailsSQL string

// RefreshDirtyRepositoriesSQL is the incremental refresh query for dirty repositories only
//
//go:embed database/queries/refresh_dirty_repositories.sql
var RefreshDirtyRepositoriesSQL string

// RefreshDirtyTagsSQL is the incremental refresh query for dirty tags only
//
//go:embed database/queries/refresh_dirty_tags.sql
var RefreshDirtyTagsSQL string
