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

-- SQLite doesn't support DROP CONSTRAINT, so we need to recreate the table
-- This is safe because we're in development and not production yet

-- Create new table without UNIQUE constraint on host
CREATE TABLE registries_new (
    id INTEGER PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    host TEXT NOT NULL,  -- Removed UNIQUE constraint
    last_status INTEGER
);

-- Copy existing data
INSERT INTO registries_new (id, name, host, last_status)
SELECT id, name, host, last_status FROM registries;

-- Drop old table (CASCADE will be handled by foreign keys)
DROP TABLE registries;

-- Rename new table
ALTER TABLE registries_new RENAME TO registries;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

-- Recreate with UNIQUE constraint
CREATE TABLE registries_new (
    id INTEGER PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    host TEXT UNIQUE NOT NULL,
    last_status INTEGER
);

-- Copy data back
INSERT INTO registries_new (id, name, host, last_status)
SELECT id, name, host, last_status FROM registries;

-- Drop current table
DROP TABLE registries;

-- Rename
ALTER TABLE registries_new RENAME TO registries;

-- +goose StatementEnd
