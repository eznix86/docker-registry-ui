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

package service

import (
	"strings"
	"time"

	"github.com/eznix86/docker-registry-ui/internal/models"
	"github.com/eznix86/docker-registry-ui/internal/repository"
)

type RepositoryService struct {
	repoRepo     *repository.RepositoryRepository
	registryRepo *repository.RegistryRepository
	tagRepo      *repository.TagRepository
	manifestRepo *repository.ManifestRepository
}

func NewRepositoryService(
	repoRepo *repository.RepositoryRepository,
	registryRepo *repository.RegistryRepository,
	tagRepo *repository.TagRepository,
	manifestRepo *repository.ManifestRepository,
) *RepositoryService {
	return &RepositoryService{
		repoRepo:     repoRepo,
		registryRepo: registryRepo,
		tagRepo:      tagRepo,
		manifestRepo: manifestRepo,
	}
}

func (s *RepositoryService) Filter(registries []string, architectures []string, showUntagged bool, search string) (*RepositoryFilterResult, error) {
	statsFilters := repository.StatsFilters{
		RegistryNames: registries,
		Architectures: architectures,
		ShowUntagged:  showUntagged,
		Search:        search,
	}

	stats, total, err := s.repoRepo.ListStats(statsFilters, repository.PaginationParams{Page: 1, PageSize: 0}, "name ASC")
	if err != nil {
		return nil, err
	}

	// Preload all registries to avoid N+1 query
	allRegistries, err := s.registryRepo.FindAll()
	if err != nil {
		return nil, err
	}
	registryMap := make(map[string]*models.Registry)
	for i := range allRegistries {
		registryMap[allRegistries[i].Name] = &allRegistries[i]
	}

	result := make([]Repository, 0, len(stats))
	for _, stat := range stats {
		result = append(result, s.statsToDTOWithMap(&stat, registryMap))
	}

	return &RepositoryFilterResult{
		Repositories: result,
		Total:        total,
	}, nil
}

func (s *RepositoryService) GetAllArchitectures() ([]string, error) {
	return s.manifestRepo.GetAllArchitectures()
}

func (s *RepositoryService) FindRepository(registryName string, namespace *string, repositoryName string) (*Repository, error) {
	registry, err := s.registryRepo.FindByName(registryName)
	if err != nil {
		return nil, err
	}

	fullName := repositoryName
	if namespace != nil {
		fullName = *namespace + "/" + repositoryName
	}

	repo, err := s.repoRepo.FindByRegistryAndName(registry.ID, fullName)
	if err != nil {
		return nil, err
	}

	return s.toRepositoryDTO(repo)
}

func (s *RepositoryService) ListTags(repoID uint) ([]Tag, error) {
	result, err := s.ListTagsWithFilters(repoID, TagFilterParams{
		SortBy: "newest",
		Page:   1,
	})
	if err != nil {
		return nil, err
	}
	return result.Tags, nil
}

type PaginatedTagsResult struct {
	Tags         []Tag
	CurrentPage  int
	NextPage     *int
	PreviousPage *int
	TotalPages   int
	TotalCount   int64
}

func (s *RepositoryService) ListTagsWithFilters(repoID uint, params TagFilterParams) (*PaginatedTagsResult, error) {
	page := params.Page
	if page <= 0 {
		page = 1
	}

	pageSize := params.PageSize
	if pageSize <= 0 {
		pageSize = 5
	}

	paginatedTags, err := s.tagRepo.FindTagDetailsWithPagination(repoID, params.SortBy, params.Search, repository.PaginationParams{
		Page:     page,
		PageSize: pageSize,
	})
	if err != nil {
		return nil, err
	}

	serviceTags := make([]Tag, 0, len(paginatedTags.Tags))
	for _, tagDetail := range paginatedTags.Tags {
		images := s.extractImagesFromManifest(tagDetail.Manifest)
		createdAt, _ := time.Parse(time.RFC3339, tagDetail.EarliestCreated)

		serviceTags = append(serviceTags, Tag{
			Name:      tagDetail.Name,
			Digest:    tagDetail.Digest,
			CreatedAt: createdAt,
			Images:    images,
			Alias:     []string{},
		})
	}

	return &PaginatedTagsResult{
		Tags:         serviceTags,
		CurrentPage:  page,
		NextPage:     paginatedTags.NextPage,
		PreviousPage: paginatedTags.PreviousPage,
		TotalPages:   paginatedTags.TotalPages,
		TotalCount:   paginatedTags.TotalCount,
	}, nil
}

func (s *RepositoryService) extractImagesFromManifest(manifest *models.Manifest) []Image {
	if manifest == nil {
		return []Image{}
	}

	if manifest.OS != "" && manifest.Architecture != "" {
		createdAt, _ := time.Parse(time.RFC3339, manifest.Created)
		return []Image{
			{
				Digest:       manifest.Digest,
				CreatedAt:    createdAt,
				OS:           manifest.OS,
				Architecture: manifest.Architecture,
				Variant:      "",
				Size:         manifest.SizeBytes,
				LastUpdated:  createdAt,
			},
		}
	}

	images := make([]Image, 0)
	for _, platformManifest := range manifest.PlatformManifests {
		createdAt, _ := time.Parse(time.RFC3339, platformManifest.Created)
		images = append(images, Image{
			Digest:       platformManifest.Digest,
			CreatedAt:    createdAt,
			OS:           platformManifest.OS,
			Architecture: platformManifest.Architecture,
			Variant:      "",
			Size:         platformManifest.SizeBytes,
			LastUpdated:  createdAt,
		})
	}

	return images
}

func (s *RepositoryService) toRepositoryDTO(repo *models.Repository) (*Repository, error) {
	var namespace *string
	parts := strings.SplitN(repo.Name, "/", 2)
	if len(parts) == 2 {
		namespace = &parts[0]
	}

	name := repo.Name
	if namespace != nil {
		name = parts[1]
	}

	stats := repo.Stats
	var err error
	if stats == nil {
		stats, err = s.repoRepo.FindStatsByID(repo.ID)
		if err != nil {
			return nil, err
		}
	}

	return s.repositoryFromStats(name, namespace, repo.Registry.Name, repo.Registry.Host, stats), nil
}

// statsToDTOWithMap converts RepositoryStats to Repository DTO using a preloaded registry map
func (s *RepositoryService) statsToDTOWithMap(stats *models.RepositoryStats, registryMap map[string]*models.Registry) Repository {
	var namespace *string
	parts := strings.SplitN(stats.Name, "/", 2)
	if len(parts) == 2 {
		namespace = &parts[0]
	}

	name := stats.Name
	if namespace != nil {
		name = parts[1]
	}

	var architectures []string
	if stats.Architectures != "" {
		for _, arch := range strings.Split(stats.Architectures, ",") {
			arch = strings.TrimSpace(arch)
			if arch != "" {
				architectures = append(architectures, arch)
			}
		}
	}

	// Use preloaded registry map to avoid N+1 query
	registryHost := ""
	if registry, exists := registryMap[stats.RegistryName]; exists {
		registryHost = registry.Host
	}

	return Repository{
		ID:            stats.ID,
		Name:          name,
		Registry:      stats.RegistryName,
		RegistryHost:  registryHost,
		Namespace:     namespace,
		Size:          stats.TotalSize,
		Architectures: architectures,
		TagsCount:     int(stats.TagsCount),
	}
}

// statsToDTO converts RepositoryStats to Repository DTO (for backward compatibility)
// Note: This method causes N+1 query - prefer statsToDTOWithMap when possible
func (s *RepositoryService) statsToDTO(stats *models.RepositoryStats) Repository {
	var namespace *string
	parts := strings.SplitN(stats.Name, "/", 2)
	if len(parts) == 2 {
		namespace = &parts[0]
	}

	name := stats.Name
	if namespace != nil {
		name = parts[1]
	}

	var architectures []string
	if stats.Architectures != "" {
		for _, arch := range strings.Split(stats.Architectures, ",") {
			arch = strings.TrimSpace(arch)
			if arch != "" {
				architectures = append(architectures, arch)
			}
		}
	}

	// Fetch registry host (N+1 query - avoid if possible)
	registryHost := ""
	if registry, err := s.registryRepo.FindByName(stats.RegistryName); err == nil {
		registryHost = registry.Host
	}

	return Repository{
		ID:            stats.ID,
		Name:          name,
		Registry:      stats.RegistryName,
		RegistryHost:  registryHost,
		Namespace:     namespace,
		Size:          stats.TotalSize,
		Architectures: architectures,
		TagsCount:     int(stats.TagsCount),
	}
}

func (s *RepositoryService) repositoryFromStats(name string, namespace *string, registryName string, registryHost string, stats *models.RepositoryStats) *Repository {
	var architectures []string
	if stats.Architectures != "" {
		for _, arch := range strings.Split(stats.Architectures, ",") {
			arch = strings.TrimSpace(arch)
			if arch != "" {
				architectures = append(architectures, arch)
			}
		}
	}

	return &Repository{
		ID:            stats.ID,
		Name:          name,
		Registry:      registryName,
		RegistryHost:  registryHost,
		Namespace:     namespace,
		Size:          stats.TotalSize,
		Architectures: architectures,
		TagsCount:     int(stats.TagsCount),
	}
}
