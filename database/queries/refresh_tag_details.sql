-- Full refresh of tag_details cache table
WITH unique_manifests_per_tag AS (
    SELECT DISTINCT
        tags.id as tag_id,
        COALESCE(platform_manifests.digest, main_manifest.digest) as manifest_digest,
        COALESCE(platform_manifests.size_bytes, main_manifest.size_bytes) as size_bytes
    FROM tags
    LEFT JOIN manifests as main_manifest ON tags.digest = main_manifest.digest
    LEFT JOIN manifests as platform_manifests ON main_manifest.digest = platform_manifests.manifest_list_digest
    WHERE COALESCE(platform_manifests.digest, main_manifest.digest) IS NOT NULL
),
tag_sizes AS (
    SELECT tag_id, SUM(size_bytes) as total_size
    FROM unique_manifests_per_tag
    GROUP BY tag_id
)
INSERT INTO tag_details (id, repo_id, name, digest, earliest_created, total_size_in_bytes, updated_at)
SELECT
    tags.id,
    tags.repo_id,
    tags.name,
    tags.digest,
    COALESCE(MIN(platform_manifests.created), main_manifest.created) as earliest_created,
    COALESCE(tag_sizes.total_size, 0) as total_size_in_bytes,
    CURRENT_TIMESTAMP
FROM tags
LEFT JOIN manifests as main_manifest ON tags.digest = main_manifest.digest
LEFT JOIN manifests as platform_manifests ON main_manifest.digest = platform_manifests.manifest_list_digest
LEFT JOIN tag_sizes ON tags.id = tag_sizes.tag_id
GROUP BY tags.id
ON CONFLICT(id) DO UPDATE SET
    repo_id = excluded.repo_id,
    name = excluded.name,
    digest = excluded.digest,
    earliest_created = excluded.earliest_created,
    total_size_in_bytes = excluded.total_size_in_bytes,
    updated_at = excluded.updated_at
