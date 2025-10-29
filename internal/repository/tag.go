// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025  Bruno Bernard
//
// This file is part of Docker Registry UI (Container Hub).
//
// Docker Registry UI is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
//
// Docker Registry UI is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.

package repository

import (
	"github.com/eznix86/docker-registry-ui/internal/models"
	"gorm.io/gorm"
)

type TagRepository struct {
	DB *gorm.DB // Exported for use in sync worker
}

func NewTagRepository(db *gorm.DB) *TagRepository {
	return &TagRepository{DB: db}
}

type PaginatedTagDetailsResult struct {
	Tags         []models.TagDetails
	CurrentPage  int
	NextPage     *int
	PreviousPage *int
	TotalPages   int
	TotalCount   int64
}

func (r *TagRepository) FindTagDetailsWithPagination(repoID uint, sortBy string, search string, pagination PaginationParams) (*PaginatedTagDetailsResult, error) {
	// Normalize pagination params
	page := pagination.Page
	if page <= 0 {
		page = 1
	}
	pageSize := pagination.PageSize
	if pageSize <= 0 {
		pageSize = 20
	}

	// Base query with filters
	query := r.DB.Model(&models.TagDetails{}).Where("repo_id = ?", repoID)
	if search != "" {
		query = query.Where("LOWER(name) LIKE ?", "%"+search+"%")
	}

	// Get total count
	var totalCount int64
	if err := query.Count(&totalCount).Error; err != nil {
		return nil, err
	}

	// Apply sorting
	switch sortBy {
	case "oldest":
		query = query.Order("earliest_created ASC")
	case "name-asc":
		query = query.Order("name ASC")
	case "name-desc":
		query = query.Order("name DESC")
	case "size-asc":
		query = query.Order("total_size_in_bytes ASC")
	case "size-desc":
		query = query.Order("total_size_in_bytes DESC")
	case "newest":
		fallthrough
	default:
		query = query.Order("earliest_created DESC")
	}

	// Apply pagination scope and fetch
	var tags []models.TagDetails
	if err := query.
		Scopes(Paginate(pagination)).
		Preload("Manifest").
		Preload("Manifest.PlatformManifests").
		Find(&tags).Error; err != nil {
		return nil, err
	}

	// Calculate pagination metadata
	nextPage, previousPage, totalPages := CalculatePaginationMetadata(page, pageSize, totalCount)

	return &PaginatedTagDetailsResult{
		Tags:         tags,
		CurrentPage:  page,
		NextPage:     nextPage,
		PreviousPage: previousPage,
		TotalPages:   totalPages,
		TotalCount:   totalCount,
	}, nil
}

// FindWithDigestsByRepo returns map[tagName]digest for a repository (for differential sync)
func (r *TagRepository) FindWithDigestsByRepo(registryName, repoName string) (map[string]string, error) {
	var results []struct {
		Name   string
		Digest string
	}

	err := r.DB.Table("tags").
		Select("tags.name, tags.digest").
		Joins("JOIN repositories ON repositories.id = tags.repo_id").
		Joins("JOIN registries ON registries.id = repositories.registry_id").
		Where("registries.name = ? AND repositories.name = ?", registryName, repoName).
		Scan(&results).Error

	if err != nil {
		return nil, err
	}

	tagDigestMap := make(map[string]string)
	for _, r := range results {
		tagDigestMap[r.Name] = r.Digest
	}
	return tagDigestMap, nil
}

// DeleteByRegistryRepoAndName deletes a tag (BeforeDelete hook marks repo as dirty)
func (r *TagRepository) DeleteByRegistryRepoAndName(registryName, repoName, tagName string) error {
	// BeforeDelete hook will mark repo as dirty before deletion
	// CASCADE will handle tag_details cleanup

	// Optimized query: direct lookup with nested subquery
	return r.DB.Exec(`
		DELETE FROM tags
		WHERE repo_id = (
			SELECT repositories.id
			FROM repositories
			JOIN registries ON registries.id = repositories.registry_id
			WHERE registries.name = ? AND repositories.name = ?
			LIMIT 1
		)
		  AND name = ?
	`, registryName, repoName, tagName).Error
}

// FindTagsNotInList returns tag names that exist in DB but not in the provided list
// Used for differential sync to find removed tags
func (r *TagRepository) FindTagsNotInList(registryName, repoName string, registryTags []string) ([]string, error) {
	if len(registryTags) == 0 {
		// If registry has no tags, all DB tags are removed
		var allTags []string
		err := r.DB.Table("tags").
			Select("tags.name").
			Joins("JOIN repositories ON repositories.id = tags.repo_id").
			Joins("JOIN registries ON registries.id = repositories.registry_id").
			Where("registries.name = ? AND repositories.name = ?", registryName, repoName).
			Pluck("tags.name", &allTags).Error
		return allTags, err
	}

	var removed []string
	err := r.DB.Table("tags").
		Select("tags.name").
		Joins("JOIN repositories ON repositories.id = tags.repo_id").
		Joins("JOIN registries ON registries.id = repositories.registry_id").
		Where("registries.name = ? AND repositories.name = ?", registryName, repoName).
		Where("tags.name NOT IN ?", registryTags).
		Pluck("tags.name", &removed).Error
	return removed, err
}

// DeleteTagsNotInList deletes all tags not in the provided list (SQL-based differential delete)
func (r *TagRepository) DeleteTagsNotInList(registryName, repoName string, registryTags []string) (int64, error) {
	if len(registryTags) == 0 {
		// Delete all tags for this repo
		result := r.DB.Exec(`
			DELETE FROM tags
			WHERE repo_id = (
				SELECT repositories.id
				FROM repositories
				JOIN registries ON registries.id = repositories.registry_id
				WHERE registries.name = ? AND repositories.name = ?
				LIMIT 1
			)
		`, registryName, repoName)
		return result.RowsAffected, result.Error
	}

	// Delete tags NOT IN the registry tag list
	result := r.DB.Exec(`
		DELETE FROM tags
		WHERE repo_id = (
			SELECT repositories.id
			FROM repositories
			JOIN registries ON registries.id = repositories.registry_id
			WHERE registries.name = ? AND repositories.name = ?
			LIMIT 1
		)
		  AND name NOT IN ?
	`, registryName, repoName, registryTags)
	return result.RowsAffected, result.Error
}
