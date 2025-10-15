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
	// Delete old data
	if err := r.db.Exec("DELETE FROM repository_stats").Error; err != nil {
		return err
	}

	// Insert new calculated data
	return r.db.Exec(`
		INSERT INTO repository_stats (id, registry_id, name, registry_name, tags_count, total_size, architectures)
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
						WHEN main_manifest.architecture != '' THEN main_manifest.architecture
						WHEN platform_manifests.architecture != '' THEN platform_manifests.architecture
					END
				) as architectures
			FROM tags
			LEFT JOIN manifests as main_manifest ON tags.digest = main_manifest.digest
			LEFT JOIN manifests as platform_manifests ON main_manifest.digest = platform_manifests.manifest_list_digest
			WHERE (main_manifest.architecture != '' OR platform_manifests.architecture != '')
			GROUP BY tags.repo_id
		),
		tag_counts AS (
			SELECT repo_id, COUNT(*) as count
			FROM tags
			GROUP BY repo_id
		)
		SELECT
			repositories.id,
			repositories.registry_id,
			repositories.name,
			registries.name as registry_name,
			COALESCE(tag_counts.count, 0) as tags_count,
			COALESCE(repo_sizes.total_size, 0) as total_size,
			repo_architectures.architectures
		FROM repositories
		LEFT JOIN registries ON repositories.registry_id = registries.id
		LEFT JOIN tag_counts ON repositories.id = tag_counts.repo_id
		LEFT JOIN repo_sizes ON repositories.id = repo_sizes.repo_id
		LEFT JOIN repo_architectures ON repositories.id = repo_architectures.repo_id
	`).Error
}

// RefreshTagDetails recalculates and updates the tag_details cache table
func (r *CacheRepository) RefreshTagDetails() error {
	// Delete old data
	if err := r.db.Exec("DELETE FROM tag_details").Error; err != nil {
		return err
	}

	// Insert new calculated data
	return r.db.Exec(`
		INSERT INTO tag_details (id, repo_id, name, digest, earliest_created)
		SELECT
			tags.id,
			tags.repo_id,
			tags.name,
			tags.digest,
			COALESCE(MIN(platform_manifests.created), main_manifest.created) as earliest_created
		FROM tags
		LEFT JOIN manifests as main_manifest ON tags.digest = main_manifest.digest
		LEFT JOIN manifests as platform_manifests ON main_manifest.digest = platform_manifests.manifest_list_digest
		GROUP BY tags.id
	`).Error
}

// RefreshAll refreshes all cache tables
func (r *CacheRepository) RefreshAll() error {
	if err := r.RefreshRepositoryStats(); err != nil {
		return err
	}
	return r.RefreshTagDetails()
}
