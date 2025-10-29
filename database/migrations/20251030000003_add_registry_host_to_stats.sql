-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Copyright (C) 2025  Bruno Bernard
--
-- This file is part of Docker Registry UI (Container Hub).
--
-- Docker Registry UI is free software: you can redistribute it and/or modify
-- it under the terms of the GNU Affero General Public License as published by
-- the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
--
-- Docker Registry UI is distributed in the hope that it will be useful,
-- but WITHOUT ANY WARRANTY; without even the implied warranty of
-- MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
-- GNU Affero General Public License for more details.
--
-- You should have received a copy of the GNU Affero General Public License
-- along with this program. If not, see <https://www.gnu.org/licenses/>.

-- +goose Up
-- +goose StatementBegin

-- Add registry_host column to repository_stats to avoid N+1 queries
ALTER TABLE repository_stats ADD COLUMN registry_host TEXT;

-- Create index for filtering by registry_host
CREATE INDEX idx_repository_stats_registry_host ON repository_stats(registry_host);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

-- Remove the column and index
DROP INDEX IF EXISTS idx_repository_stats_registry_host;

-- SQLite doesn't support DROP COLUMN directly, need to recreate table
CREATE TABLE repository_stats_new (
    id INTEGER PRIMARY KEY,
    registry_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    registry_name TEXT,
    tags_count INTEGER DEFAULT 0,
    total_size INTEGER DEFAULT 0,
    architectures TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id) REFERENCES repositories(id) ON DELETE CASCADE
);

INSERT INTO repository_stats_new (id, registry_id, name, registry_name, tags_count, total_size, architectures, updated_at)
SELECT id, registry_id, name, registry_name, tags_count, total_size, architectures, updated_at FROM repository_stats;

DROP TABLE repository_stats;
ALTER TABLE repository_stats_new RENAME TO repository_stats;

CREATE INDEX idx_repository_stats_registry ON repository_stats(registry_id);
CREATE INDEX idx_repository_stats_registry_name ON repository_stats(registry_name);

-- +goose StatementEnd
