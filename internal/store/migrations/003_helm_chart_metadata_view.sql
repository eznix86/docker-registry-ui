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
	CASE WHEN t.kind = 'helm' THEN json_extract(cb.config_json, '$.name') END AS chart_name,
	CASE WHEN t.kind = 'helm' THEN json_extract(cb.config_json, '$.version') END AS chart_version,
	CASE WHEN t.kind = 'helm' THEN json_extract(cb.config_json, '$.description') END AS chart_desc,
	CASE WHEN t.kind = 'helm' THEN json_extract(cb.config_json, '$.apiVersion') END AS chart_api_version,
	CASE WHEN t.kind = 'helm' THEN json_extract(cb.config_json, '$.type') END AS chart_type
FROM tags t
LEFT JOIN manifests m ON m.digest = t.digest
LEFT JOIN config_blobs cb ON cb.digest = m.config_digest;

PRAGMA foreign_keys=ON;
