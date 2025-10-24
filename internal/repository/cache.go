// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

package repository

import (
	"gorm.io/gorm"
)

type CacheRepository struct {
	db *gorm.DB
}

func NewCacheRepository(db *gorm.DB) *CacheRepository {
	return &CacheRepository{db: db}
}

// RefreshRepositoryStats recalculates and updates the repository_stats cache table
func (r *CacheRepository) RefreshRepositoryStats() error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec("DELETE FROM repository_stats WHERE id NOT IN (SELECT id FROM repositories)").Error; err != nil {
			return err
		}

		return tx.Exec(`
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
        `).Error
	})
}

// RefreshTagDetails recalculates and updates the tag_details cache table
func (r *CacheRepository) RefreshTagDetails() error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec("DELETE FROM tag_details WHERE id NOT IN (SELECT id FROM tags)").Error; err != nil {
			return err
		}

		return tx.Exec(`
            INSERT INTO tag_details (id, repo_id, name, digest, earliest_created, updated_at)
            SELECT
                tags.id,
                tags.repo_id,
                tags.name,
                tags.digest,
                COALESCE(MIN(platform_manifests.created), main_manifest.created) as earliest_created,
                CURRENT_TIMESTAMP
            FROM tags
            LEFT JOIN manifests as main_manifest ON tags.digest = main_manifest.digest
            LEFT JOIN manifests as platform_manifests ON main_manifest.digest = platform_manifests.manifest_list_digest
            GROUP BY tags.id
            ON CONFLICT(id) DO UPDATE SET
                repo_id = excluded.repo_id,
                name = excluded.name,
                digest = excluded.digest,
                earliest_created = excluded.earliest_created,
                updated_at = excluded.updated_at
        `).Error
	})
}

// RefreshAll refreshes all cache tables
func (r *CacheRepository) RefreshAll() error {
	if err := r.RefreshRepositoryStats(); err != nil {
		return err
	}
	return r.RefreshTagDetails()
}
