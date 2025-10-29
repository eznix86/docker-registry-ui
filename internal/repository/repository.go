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
	"fmt"
	"strings"

	"github.com/eznix86/docker-registry-ui/internal/models"
	"gorm.io/gorm"
)

type RepositoryRepository struct {
	DB *gorm.DB // Exported for use in sync worker
}

func NewRepositoryRepository(db *gorm.DB) *RepositoryRepository {
	return &RepositoryRepository{DB: db}
}

func (r *RepositoryRepository) baseStatsQuery(filters StatsFilters) *gorm.DB {
	query := r.DB.Model(&models.RepositoryStats{})

	if len(filters.RegistryHosts) > 0 {
		query = query.Where("registry_host IN ?", filters.RegistryHosts)
	}

	if !filters.ShowUntagged {
		query = query.Where("tags_count > 0")
	}

	if filters.Search != "" {
		query = query.Where("LOWER(name) LIKE ?", "%"+strings.ToLower(filters.Search)+"%")
	}

	if len(filters.Architectures) > 0 {
		// Architectures are stored as a comma-separated list. To keep the schema
		// untouched for now we do a simple containment check using LIKE against
		// a padded version of the column (",amd64,").
		ors := make([]string, 0, len(filters.Architectures))
		args := make([]any, 0, len(filters.Architectures))
		for _, arch := range filters.Architectures {
			ors = append(ors, "(',' || COALESCE(architectures, '') || ',') LIKE ?")
			args = append(args, fmt.Sprintf("%%,%s,%%", arch))
		}
		query = query.Where(strings.Join(ors, " OR "), args...)
	}

	return query
}

func (r *RepositoryRepository) CountStats(filters StatsFilters) (int64, error) {
	var total int64
	if err := r.baseStatsQuery(filters).Count(&total).Error; err != nil {
		return 0, err
	}
	return total, nil
}

func (r *RepositoryRepository) ListStats(filters StatsFilters, pagination PaginationParams, orderBy string) ([]models.RepositoryStats, int64, error) {
	query := r.baseStatsQuery(filters)

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if orderBy == "" {
		orderBy = "name ASC"
	}

	scoped := query.Order(orderBy).Scopes(Paginate(pagination))

	var stats []models.RepositoryStats
	if err := scoped.Find(&stats).Error; err != nil {
		return nil, 0, err
	}

	return stats, total, nil
}

func (r *RepositoryRepository) FindAllStats() ([]models.RepositoryStats, error) {
	var stats []models.RepositoryStats
	if err := r.DB.Find(&stats).Error; err != nil {
		return nil, err
	}
	return stats, nil
}

func (r *RepositoryRepository) FindByRegistryAndName(registryID uint, name string) (*models.Repository, error) {
	var repository models.Repository
	if err := r.DB.Where("registry_id = ? AND name = ?", registryID, name).
		Preload("Registry").
		Preload("Stats").
		First(&repository).Error; err != nil {
		return nil, err
	}
	return &repository, nil
}

func (r *RepositoryRepository) FindStatsByID(id uint) (*models.RepositoryStats, error) {
	var stats models.RepositoryStats
	if err := r.DB.Where("id = ?", id).First(&stats).Error; err != nil {
		return nil, err
	}
	return &stats, nil
}

// FindNamesByRegistryName gets all repository names for a registry (for differential sync)
func (r *RepositoryRepository) FindNamesByRegistryName(registryName string) ([]string, error) {
	var names []string
	err := r.DB.Table("repositories").
		Select("repositories.name").
		Joins("JOIN registries ON registries.id = repositories.registry_id").
		Where("registries.name = ?", registryName).
		Pluck("repositories.name", &names).Error
	return names, err
}

// DeleteByRegistryAndName deletes a repository (CASCADE handles tags, dirty tracking)
func (r *RepositoryRepository) DeleteByRegistryAndName(registryName, repoName string) error {
	// CASCADE will delete:
	// - All tags in this repo
	// - dirty_repos entry
	// - repository_stats entry
	// - tag_details entries (via tags CASCADE)
	// Before deletion, tags will fire BeforeDelete hooks to mark repo as dirty

	// Optimized query: direct lookup instead of subquery with IN
	return r.DB.Exec(`
		DELETE FROM repositories
		WHERE registry_id = (SELECT id FROM registries WHERE name = ? LIMIT 1)
		  AND name = ?
	`, registryName, repoName).Error
}

// FindReposNotInList returns repository names that exist in DB but not in the provided list
// Used for differential sync to find removed repositories
func (r *RepositoryRepository) FindReposNotInList(registryName string, registryRepos []string) ([]string, error) {
	if len(registryRepos) == 0 {
		// If registry has no repos, all DB repos are removed
		return r.FindNamesByRegistryName(registryName)
	}

	var removed []string
	err := r.DB.Table("repositories").
		Select("repositories.name").
		Joins("JOIN registries ON registries.id = repositories.registry_id").
		Where("registries.name = ?", registryName).
		Where("repositories.name NOT IN ?", registryRepos).
		Pluck("repositories.name", &removed).Error
	return removed, err
}

// FindNewRepos returns repository names from the list that don't exist in DB
// Used for differential sync to find new repositories
func (r *RepositoryRepository) FindNewRepos(registryName string, registryRepos []string) ([]string, error) {
	if len(registryRepos) == 0 {
		return []string{}, nil
	}

	// Get existing repo names
	existing, err := r.FindNamesByRegistryName(registryName)
	if err != nil {
		return nil, err
	}

	if len(existing) == 0 {
		// All registry repos are new
		return registryRepos, nil
	}

	// Use SQL to find repos that are in registryRepos but not in existing
	existingSet := make(map[string]bool, len(existing))
	for _, name := range existing {
		existingSet[name] = true
	}

	newRepos := make([]string, 0)
	for _, name := range registryRepos {
		if !existingSet[name] {
			newRepos = append(newRepos, name)
		}
	}

	return newRepos, nil
}

// DeleteReposNotInList deletes all repositories not in the provided list (SQL-based differential delete)
func (r *RepositoryRepository) DeleteReposNotInList(registryName string, registryRepos []string) (int64, error) {
	if len(registryRepos) == 0 {
		// Delete all repos for this registry
		result := r.DB.Exec(`
			DELETE FROM repositories
			WHERE registry_id = (SELECT id FROM registries WHERE name = ? LIMIT 1)
		`, registryName)
		return result.RowsAffected, result.Error
	}

	// Delete repos NOT IN the registry catalog
	result := r.DB.Exec(`
		DELETE FROM repositories
		WHERE registry_id = (SELECT id FROM registries WHERE name = ? LIMIT 1)
		  AND name NOT IN ?
	`, registryName, registryRepos)
	return result.RowsAffected, result.Error
}
