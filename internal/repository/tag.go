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
	db *gorm.DB
}

func NewTagRepository(db *gorm.DB) *TagRepository {
	return &TagRepository{db: db}
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
	query := r.db.Model(&models.TagDetails{}).Where("repo_id = ?", repoID)
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
	case "name":
		query = query.Order("name ASC")
	case "size":
		query = query.Order("total_size_in_bytes ASC")
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
