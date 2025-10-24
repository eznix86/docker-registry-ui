// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

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

	result := make([]Repository, 0, len(stats))
	for _, stat := range stats {
		result = append(result, s.statsToDTO(&stat))
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

	return s.repositoryFromStats(name, namespace, repo.Registry.Name, stats), nil
}

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

	return Repository{
		ID:            stats.ID,
		Name:          name,
		Registry:      stats.RegistryName,
		Namespace:     namespace,
		Size:          stats.TotalSize,
		Architectures: architectures,
		TagsCount:     int(stats.TagsCount),
	}
}

func (s *RepositoryService) repositoryFromStats(name string, namespace *string, registryName string, stats *models.RepositoryStats) *Repository {
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
		Namespace:     namespace,
		Size:          stats.TotalSize,
		Architectures: architectures,
		TagsCount:     int(stats.TagsCount),
	}
}
