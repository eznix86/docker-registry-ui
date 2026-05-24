PRAGMA foreign_keys=OFF;

DROP VIEW IF EXISTS repositories_view;
DROP VIEW IF EXISTS tags_view;

ALTER TABLE registries RENAME TO registries_old;
ALTER TABLE repositories RENAME TO repositories_old;
ALTER TABLE tags RENAME TO tags_old;

CREATE TABLE registries (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	name TEXT NOT NULL,
	host TEXT NOT NULL UNIQUE,
	url TEXT NOT NULL,
	status INTEGER DEFAULT 0,
	last_sync_at DATETIME,
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO registries (id, name, host, url, status, last_sync_at, created_at)
SELECT id, name, host, url, status, last_sync_at, created_at
FROM registries_old;

CREATE TABLE repositories (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	registry_id INTEGER NOT NULL REFERENCES registries(id) ON DELETE CASCADE,
	namespace TEXT NOT NULL DEFAULT '',
	name TEXT NOT NULL,
	last_sync_at DATETIME,
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	UNIQUE(registry_id, namespace, name)
);

INSERT INTO repositories (id, registry_id, namespace, name, last_sync_at, created_at)
SELECT id, registry_id, namespace, name, last_sync_at, created_at
FROM repositories_old;

CREATE TABLE tags (
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

INSERT INTO tags (
	id, repo_id, name, digest, kind, media_type, priority,
	next_check_at, sync_status, last_error, last_sync_at, created_at
)
SELECT
	id, repo_id, name, digest, kind, media_type, priority,
	next_check_at, sync_status, last_error, last_sync_at, created_at
FROM tags_old;

DROP TABLE tags_old;
DROP TABLE repositories_old;
DROP TABLE registries_old;

CREATE INDEX idx_repos_registry ON repositories(registry_id);
CREATE INDEX idx_tags_repo ON tags(repo_id);
CREATE INDEX idx_tags_digest ON tags(digest);
CREATE INDEX idx_tags_next_check ON tags(next_check_at);

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

PRAGMA foreign_keys=ON;
