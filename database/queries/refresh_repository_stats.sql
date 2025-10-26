-- Full refresh of repository_stats cache table
WITH unique_manifests_per_repo AS (
    SELECT DISTINCT
        tags.repo_id,
        COALESCE(platform_manifests.digest, main_manifest.digest) as manifest_digest,
        COALESCE(platform_manifests.size_bytes, main_manifest.size_bytes) as size_bytes
    FROM tags
    LEFT JOIN manifests as main_manifest ON tags.digest = main_manifest.digest
    LEFT JOIN manifests as platform_manifests ON main_manifest.digest = platform_manifests.manifest_list_digest
    WHERE COALESCE(platform_manifests.digest, main_manifest.digest) IS NOT NULL
),
repo_sizes AS (
    SELECT repo_id, SUM(size_bytes) as total_size
    FROM unique_manifests_per_repo
    GROUP BY repo_id
),
repo_architectures AS (
    SELECT
        tags.repo_id,
        GROUP_CONCAT(DISTINCT
            CASE
                WHEN TRIM(main_manifest.architecture) != '' THEN TRIM(main_manifest.architecture)
                WHEN TRIM(platform_manifests.architecture) != '' THEN TRIM(platform_manifests.architecture)
            END
        ) as architectures
    FROM tags
    LEFT JOIN manifests as main_manifest ON tags.digest = main_manifest.digest
    LEFT JOIN manifests as platform_manifests ON main_manifest.digest = platform_manifests.manifest_list_digest
    WHERE (TRIM(main_manifest.architecture) != '' OR TRIM(platform_manifests.architecture) != '')
    GROUP BY tags.repo_id
),
tag_counts AS (
    SELECT repo_id, COUNT(*) as count
    FROM tags
    GROUP BY repo_id
)
INSERT INTO repository_stats (id, registry_id, name, registry_name, tags_count, total_size, architectures, updated_at)
SELECT
    repositories.id,
    repositories.registry_id,
    repositories.name,
    registries.name as registry_name,
    COALESCE(tag_counts.count, 0) as tags_count,
    COALESCE(repo_sizes.total_size, 0) as total_size,
    COALESCE(repo_architectures.architectures, '') as architectures,
    CURRENT_TIMESTAMP
FROM repositories
LEFT JOIN registries ON repositories.registry_id = registries.id
LEFT JOIN tag_counts ON repositories.id = tag_counts.repo_id
LEFT JOIN repo_sizes ON repositories.id = repo_sizes.repo_id
LEFT JOIN repo_architectures ON repositories.id = repo_architectures.repo_id
ON CONFLICT(id) DO UPDATE SET
    registry_id = excluded.registry_id,
    name = excluded.name,
    registry_name = excluded.registry_name,
    tags_count = excluded.tags_count,
    total_size = excluded.total_size,
    architectures = excluded.architectures,
    updated_at = excluded.updated_at
