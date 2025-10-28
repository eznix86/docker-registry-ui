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
