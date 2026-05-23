package store

import (
	"context"
	"database/sql"
	"fmt"
)

const currentSchemaVersion = 1

type migration struct {
	version int
	name    string
	up      string
}

var migrations = []migration{
	{
		version: 1,
		name:    "initial_schema",
		up: `
CREATE TABLE IF NOT EXISTS registries (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	name TEXT NOT NULL UNIQUE,
	host TEXT NOT NULL UNIQUE,
	url TEXT NOT NULL,
	status INTEGER DEFAULT 0,
	last_sync_at DATETIME,
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS repositories (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	registry_id INTEGER NOT NULL REFERENCES registries(id) ON DELETE CASCADE,
	namespace TEXT NOT NULL DEFAULT '',
	name TEXT NOT NULL,
	last_sync_at DATETIME,
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	UNIQUE(registry_id, namespace, name)
);
CREATE INDEX IF NOT EXISTS idx_repos_registry ON repositories(registry_id);

CREATE TABLE IF NOT EXISTS tags (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	repo_id INTEGER NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
	name TEXT NOT NULL,
	digest TEXT NOT NULL,
	kind TEXT NOT NULL DEFAULT '',
	media_type TEXT NOT NULL DEFAULT '',
	priority REAL DEFAULT 1.0,
	next_check_at DATETIME,
	sync_status TEXT DEFAULT 'pending',
	last_error TEXT DEFAULT '',
	last_sync_at DATETIME,
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	UNIQUE(repo_id, name)
);
CREATE INDEX IF NOT EXISTS idx_tags_repo ON tags(repo_id);
CREATE INDEX IF NOT EXISTS idx_tags_digest ON tags(digest);
CREATE INDEX IF NOT EXISTS idx_tags_next_check ON tags(next_check_at);

CREATE TABLE IF NOT EXISTS manifests (
	digest TEXT PRIMARY KEY,
	kind TEXT NOT NULL DEFAULT '',
	media_type TEXT NOT NULL DEFAULT '',
	raw_json TEXT NOT NULL DEFAULT '',
	config_digest TEXT,
	os TEXT,
	architecture TEXT,
	variant TEXT,
	size_bytes INTEGER NOT NULL DEFAULT 0,
	created DATETIME,
	seen_at DATETIME
);

CREATE TABLE IF NOT EXISTS manifest_platforms (
	index_digest TEXT NOT NULL REFERENCES manifests(digest) ON DELETE CASCADE,
	platform_digest TEXT NOT NULL REFERENCES manifests(digest) ON DELETE CASCADE,
	os TEXT NOT NULL DEFAULT '',
	architecture TEXT NOT NULL DEFAULT '',
	variant TEXT NOT NULL DEFAULT '',
	position INTEGER NOT NULL DEFAULT 0,
	size_bytes INTEGER NOT NULL DEFAULT 0,
	PRIMARY KEY (index_digest, platform_digest)
);
CREATE INDEX IF NOT EXISTS idx_platforms_index ON manifest_platforms(index_digest);

CREATE TABLE IF NOT EXISTS config_blobs (
	digest TEXT PRIMARY KEY,
	size_bytes INTEGER NOT NULL DEFAULT 0,
	created DATETIME,
	config_json TEXT NOT NULL DEFAULT '',
	os TEXT NOT NULL DEFAULT '',
	architecture TEXT NOT NULL DEFAULT '',
	seen_at DATETIME
);

CREATE TABLE IF NOT EXISTS layers (
	digest TEXT PRIMARY KEY,
	size_bytes INTEGER NOT NULL DEFAULT 0,
	media_type TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS manifest_layers (
	manifest_digest TEXT NOT NULL REFERENCES manifests(digest) ON DELETE CASCADE,
	layer_digest TEXT NOT NULL REFERENCES layers(digest) ON DELETE CASCADE,
	position INTEGER NOT NULL,
	PRIMARY KEY (manifest_digest, layer_digest, position)
);
CREATE INDEX IF NOT EXISTS idx_manifest_layers_layer ON manifest_layers(layer_digest);

DROP VIEW IF EXISTS repositories_view;
CREATE VIEW IF NOT EXISTS repositories_view AS
WITH repo_tags AS (
	SELECT repo_id AS repository_id, COUNT(*) AS tags_count
	FROM tags
	GROUP BY repo_id
),
repo_size AS (
	SELECT
		t.repo_id AS repository_id,
		COALESCE(SUM(DISTINCT m.size_bytes), 0) AS total_size_bytes
	FROM tags t
	JOIN manifests m ON m.digest = t.digest
	GROUP BY t.repo_id
),
repo_archs AS (
	SELECT
		t.repo_id AS repository_id,
		json_group_array(DISTINCT
			CASE
				WHEN t.kind = 'index' AND mp.variant != '' THEN mp.architecture || '/' || mp.variant
				WHEN t.kind = 'index' THEN mp.architecture
				WHEN m.variant != '' THEN m.architecture || '/' || m.variant
				ELSE m.architecture
			END
		) AS architectures
	FROM tags t
	LEFT JOIN manifest_platforms mp ON t.digest = mp.index_digest
	LEFT JOIN manifests m ON m.digest = t.digest
	WHERE (t.kind = 'index' AND mp.architecture != '' OR t.kind = 'image' AND m.architecture != '')
	GROUP BY t.repo_id
)
SELECT
	r.id,
	r.name,
	r.namespace,
	reg.name AS registry,
	reg.host AS registry_host,
	COALESCE(rt.tags_count, 0) AS tags_count,
	COALESCE(ra.architectures, '[]') AS architectures,
	COALESCE(rs.total_size_bytes, 0) AS total_size_bytes
FROM repositories r
JOIN registries reg ON r.registry_id = reg.id
LEFT JOIN repo_tags rt ON r.id = rt.repository_id
LEFT JOIN repo_archs ra ON r.id = ra.repository_id
LEFT JOIN repo_size rs ON r.id = rs.repository_id
GROUP BY r.id;

DROP VIEW IF EXISTS tags_view;
CREATE VIEW IF NOT EXISTS tags_view AS
SELECT
	t.id,
	t.repo_id AS repository_id,
	t.name,
	t.digest,
	t.kind,
	t.media_type,
	t.last_sync_at,
	t.priority,
	COALESCE(m.size_bytes, 0) AS total_size,
	1 AS image_count,
	COALESCE(m.created, cb.created) AS created_at,
	CASE WHEN t.kind = 'helm' THEN json_extract(cb.config_json, '$.name') END as chart_name,
	CASE WHEN t.kind = 'helm' THEN json_extract(cb.config_json, '$.version') END as chart_version,
	CASE WHEN t.kind = 'helm' THEN json_extract(cb.config_json, '$.description') END as chart_desc
FROM tags t
LEFT JOIN manifests m ON m.digest = t.digest
LEFT JOIN config_blobs cb ON cb.digest = m.config_digest;
`,
	},
}

func migrate(ctx context.Context, db *sql.DB) error {
	if _, err := db.ExecContext(ctx, `CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)`); err != nil {
		return fmt.Errorf("create schema_version table: %w", err)
	}

	var currentVersion int
	row := db.QueryRowContext(ctx, "SELECT COALESCE(MAX(version), 0) FROM schema_version")
	if err := row.Scan(&currentVersion); err != nil {
		return fmt.Errorf("read schema version: %w", err)
	}

	for _, m := range migrations {
		if m.version <= currentVersion {
			continue
		}
		if _, err := db.ExecContext(ctx, m.up); err != nil {
			return fmt.Errorf("migration %d %s: %w", m.version, m.name, err)
		}
		if _, err := db.ExecContext(ctx, "INSERT INTO schema_version (version) VALUES (?)", m.version); err != nil {
			return fmt.Errorf("record migration %d %s: %w", m.version, m.name, err)
		}
	}

	return nil
}
