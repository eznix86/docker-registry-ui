// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

package repository

import (
	assets "github.com/eznix86/docker-registry-ui"
	"gorm.io/gorm"
)

type CacheRepository struct {
	db *gorm.DB
}

func NewCacheRepository(db *gorm.DB) *CacheRepository {
	return &CacheRepository{db: db}
}

// RefreshRepositoryStats recalculates and updates the repository_stats cache table (full refresh)
func (r *CacheRepository) RefreshRepositoryStats() error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec("DELETE FROM repository_stats WHERE id NOT IN (SELECT id FROM repositories)").Error; err != nil {
			return err
		}

		return tx.Exec(assets.RefreshRepositoryStatsSQL).Error
	})
}

// RefreshTagDetails recalculates and updates the tag_details cache table (full refresh)
func (r *CacheRepository) RefreshTagDetails() error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec("DELETE FROM tag_details WHERE id NOT IN (SELECT id FROM tags)").Error; err != nil {
			return err
		}

		return tx.Exec(assets.RefreshTagDetailsSQL).Error
	})
}

// RefreshDirtyRepositories recalculates and updates repository_stats for dirty repositories only
func (r *CacheRepository) RefreshDirtyRepositories() error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// Refresh only dirty repos
		if err := tx.Exec(assets.RefreshDirtyRepositoriesSQL).Error; err != nil {
			return err
		}

		// Clear dirty table after successful refresh
		return tx.Exec("DELETE FROM dirty_repos").Error
	})
}

// RefreshDirtyTags recalculates and updates tag_details for dirty tags only
func (r *CacheRepository) RefreshDirtyTags() error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// Refresh only dirty tags
		if err := tx.Exec(assets.RefreshDirtyTagsSQL).Error; err != nil {
			return err
		}

		// Clear dirty table after successful refresh
		return tx.Exec("DELETE FROM dirty_tags").Error
	})
}

// MarkAllDirty marks all repositories and tags as dirty (useful for initial seed)
func (r *CacheRepository) MarkAllDirty() error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// Mark all repositories as dirty
		if err := tx.Exec("INSERT OR IGNORE INTO dirty_repos (repo_id) SELECT id FROM repositories").Error; err != nil {
			return err
		}

		// Mark all tags as dirty
		return tx.Exec("INSERT OR IGNORE INTO dirty_tags (tag_id) SELECT id FROM tags").Error
	})
}

// RefreshAll refreshes all cache tables (full rebuild)
func (r *CacheRepository) RefreshAll() error {
	if err := r.RefreshRepositoryStats(); err != nil {
		return err
	}
	return r.RefreshTagDetails()
}

// RefreshAllDirty refreshes all cache tables using dirty-based approach
func (r *CacheRepository) RefreshAllDirty() error {
	if err := r.RefreshDirtyRepositories(); err != nil {
		return err
	}
	return r.RefreshDirtyTags()
}
