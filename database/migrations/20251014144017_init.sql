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

CREATE TABLE IF NOT EXISTS registries (
    id INTEGER PRIMARY KEY,
    name TEXT UNIQUE NOT NULL, -- name of the registry
    host TEXT UNIQUE NOT NULL, -- combination of host and port if port is specified
    last_status INTEGER
);

CREATE TABLE IF NOT EXISTS repositories (
    id INTEGER PRIMARY KEY,
    registry_id INTEGER NOT NULL REFERENCES registries(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    UNIQUE(registry_id, name)
);

CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY,
    repo_id INTEGER NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    digest TEXT NOT NULL,
    UNIQUE(repo_id, name)
);

CREATE TABLE IF NOT EXISTS manifests (
    digest TEXT PRIMARY KEY,
    media_type TEXT NOT NULL,
    os TEXT,
    architecture TEXT,
    created TEXT,
    size_bytes INTEGER DEFAULT 0,
    manifest_list_digest TEXT REFERENCES manifests(digest) ON DELETE CASCADE
);

CREATE TABLE  IF NOT EXISTS manifest_layers (
    manifest_digest TEXT NOT NULL REFERENCES manifests(digest) ON DELETE CASCADE,
    layer_digest TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    PRIMARY KEY (manifest_digest, layer_digest)
);

-- Cache table for repository statistics
CREATE TABLE IF NOT EXISTS repository_stats (
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

CREATE INDEX idx_repository_stats_registry ON repository_stats(registry_id);

-- Cache table for tag details with earliest created time
CREATE TABLE IF NOT EXISTS tag_details (
    id INTEGER PRIMARY KEY,
    repo_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    digest TEXT NOT NULL,
    earliest_created TEXT,
    total_size_in_bytes INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id) REFERENCES tags(id) ON DELETE CASCADE,
    FOREIGN KEY (repo_id) REFERENCES repositories(id) ON DELETE CASCADE
);

CREATE INDEX idx_tag_details_repo ON tag_details(repo_id);
CREATE INDEX idx_tag_details_earliest ON tag_details(earliest_created);
CREATE INDEX idx_tag_details_size ON tag_details(total_size_in_bytes);

-- Dirty tracking tables for incremental cache refresh
CREATE TABLE IF NOT EXISTS dirty_repos (
    repo_id INTEGER PRIMARY KEY,
    marked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (repo_id) REFERENCES repositories(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS dirty_tags (
    tag_id INTEGER PRIMARY KEY,
    marked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX idx_dirty_repos_marked ON dirty_repos(marked_at);
CREATE INDEX idx_dirty_tags_marked ON dirty_tags(marked_at);

-- Job queue table for background sync workers
CREATE TABLE IF NOT EXISTS sync_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Job identification
    job_type TEXT NOT NULL,              -- 'sync_catalog', 'sync_tags', 'sync_manifest'
    registry_name TEXT NOT NULL,         -- e.g., 'default', 'personal'
    registry_url TEXT NOT NULL,
    repository TEXT,                     -- NULL for catalog jobs
    tag_ref TEXT,                        -- NULL for non-manifest jobs

    -- State management
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
    priority INTEGER DEFAULT 0,

    -- Retry logic
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    next_retry_at TIMESTAMP,
    backoff_seconds INTEGER DEFAULT 1,

    -- Error tracking
    error_message TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,

    -- Idempotency: prevent duplicate jobs
    UNIQUE(job_type, registry_name, repository, tag_ref)
);

-- Index for efficient job dequeuing
CREATE INDEX IF NOT EXISTS idx_sync_jobs_dequeue
ON sync_jobs(status, priority DESC, next_retry_at, created_at);

-- Index for registry-specific queries
CREATE INDEX IF NOT EXISTS idx_sync_jobs_registry
ON sync_jobs(registry_name, repository);

-- Index for job queue polling by status
CREATE INDEX IF NOT EXISTS idx_sync_jobs_status ON sync_jobs(status);

-- Additional performance indexes
CREATE INDEX IF NOT EXISTS idx_repository_stats_registry_name ON repository_stats(registry_name);
CREATE INDEX IF NOT EXISTS idx_repositories_registry_id_name ON repositories(registry_id, name);
CREATE INDEX IF NOT EXISTS idx_tags_repo_id_name ON tags(repo_id, name);
CREATE INDEX IF NOT EXISTS idx_tags_repo_id_digest ON tags(repo_id, digest);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

-- Drop indexes first
DROP INDEX IF EXISTS idx_tags_repo_id_digest;
DROP INDEX IF EXISTS idx_tags_repo_id_name;
DROP INDEX IF EXISTS idx_repositories_registry_id_name;
DROP INDEX IF EXISTS idx_repository_stats_registry_name;
DROP INDEX IF EXISTS idx_sync_jobs_status;
DROP INDEX IF EXISTS idx_sync_jobs_registry;
DROP INDEX IF EXISTS idx_sync_jobs_dequeue;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS sync_jobs;
DROP TABLE IF EXISTS dirty_tags;
DROP TABLE IF EXISTS dirty_repos;
DROP TABLE IF EXISTS tag_details;
DROP TABLE IF EXISTS repository_stats;
DROP TABLE IF EXISTS manifest_layers;
DROP TABLE IF EXISTS manifests;
DROP TABLE IF EXISTS tags;
DROP TABLE IF EXISTS repositories;
DROP TABLE IF EXISTS registries;

-- +goose StatementEnd
