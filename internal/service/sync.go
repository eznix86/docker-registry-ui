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
	"context"
	"fmt"
	"log"
	"strings"

	"github.com/eznix86/docker-registry-ui/internal/repository"
	"github.com/eznix86/docker-registry-ui/pkg/registry"
	"gorm.io/gorm"
)

// SyncService handles direct registry synchronization
type SyncService struct {
	db           *gorm.DB
	registryRepo *repository.RegistryRepository
	repoRepo     *repository.RepositoryRepository
	tagRepo      *repository.TagRepository
	cacheRepo    *repository.CacheRepository
	registryMgr  *registry.Manager
}

// NewSyncService creates a new sync service
func NewSyncService(db *gorm.DB) *SyncService {
	return &SyncService{
		db:           db,
		registryRepo: repository.NewRegistryRepository(db),
		repoRepo:     repository.NewRepositoryRepository(db),
		tagRepo:      repository.NewTagRepository(db),
		cacheRepo:    repository.NewCacheRepository(db),
		registryMgr:  nil, // Will be initialized in SyncAllRegistries
	}
}

// SyncAllRegistries synchronizes all configured registries
func (s *SyncService) SyncAllRegistries(ctx context.Context, configs []registry.RegistryConfig) error {
	log.Printf("Starting sync for %d registries", len(configs))

	// Create registry manager
	var err error
	s.registryMgr, err = registry.NewManager(configs)
	if err != nil {
		return fmt.Errorf("failed to create registry manager: %w", err)
	}

	// Cleanup registries not in environment config (CASCADE deletes all data)
	if err := s.cleanupRemovedRegistries(configs); err != nil {
		return fmt.Errorf("failed to cleanup registries: %w", err)
	}

	for _, config := range configs {
		// Ensure registry exists in DB first (even if sync fails)
		s.ensureRegistryExists(config)

		statusCode, err := s.syncRegistry(ctx, config)
		if err != nil {
			log.Printf("Error syncing registry '%s': %v", config.Name, err)
			if statusCode == 0 {
				statusCode = 500
			}
			if updateErr := s.updateRegistryStatus(config.Name, statusCode); updateErr != nil {
				log.Printf("Warning: failed to update registry status for '%s': %v", config.Name, updateErr)
			}
			continue
		}
		if err := s.updateRegistryStatus(config.Name, statusCode); err != nil {
			log.Printf("Warning: failed to update registry status for '%s': %v", config.Name, err)
		}
	}

	log.Printf("Refreshing dirty cache...")
	if err := s.cacheRepo.RefreshAllDirty(); err != nil {
		log.Printf("Warning: cache refresh failed: %v", err)
	}

	log.Printf("Sync completed for all registries")
	return nil
}

// syncRegistry syncs a single registry's catalog and all repositories
// Returns the HTTP status code from the registry API
func (s *SyncService) syncRegistry(ctx context.Context, config registry.RegistryConfig) (int, error) {
	log.Printf("Syncing registry '%s' (%s)", config.Name, config.URL)

	// Get registry client
	client, err := s.registryMgr.GetClient(config.Name)
	if err != nil {
		return 0, fmt.Errorf("failed to get registry client: %w", err)
	}

	// Fetch catalog from registry
	catalog, err := client.ListRepositories(ctx, nil)
	if err != nil {
		// Try to extract HTTP status code from error
		return s.extractHTTPStatus(err), fmt.Errorf("failed to list repositories: %w", err)
	}

	// SQL-based differential sync: delete repos NOT IN registry catalog
	rowsDeleted, err := s.repoRepo.DeleteReposNotInList(config.Name, catalog.Repositories)
	if err != nil {
		log.Printf("Warning: failed to delete removed repos: %v", err)
	} else if rowsDeleted > 0 {
		log.Printf("Deleted %d removed repository(ies) (SQL-based)", rowsDeleted)
	}

	// Find new repos (SQL-based)
	newRepos, err := s.repoRepo.FindNewRepos(config.Name, catalog.Repositories)
	if err != nil {
		return 500, fmt.Errorf("failed to find new repos: %w", err)
	}

	unchangedCount := len(catalog.Repositories) - len(newRepos)
	log.Printf("Catalog sync for '%s': %d new, %d unchanged, %d removed",
		config.Name, len(newRepos), unchangedCount, rowsDeleted)

	// Sync all repositories (new and unchanged - unchanged may have new tags)
	for _, repoName := range catalog.Repositories {
		if err := s.syncRepository(ctx, client, config, repoName); err != nil {
			log.Printf("Error syncing repository %s/%s: %v", config.Name, repoName, err)
			continue
		}
	}

	// Return 200 OK if we successfully fetched the catalog
	return 200, nil
}

// syncRepository syncs all tags for a repository
func (s *SyncService) syncRepository(ctx context.Context, client registry.Client, config registry.RegistryConfig, repoName string) error {
	// Fetch tags list from registry
	tagsResp, err := client.ListTags(ctx, repoName, nil)
	if err != nil {
		return fmt.Errorf("failed to list tags: %w", err)
	}

	// SQL-based differential sync: delete tags NOT IN registry tag list
	rowsDeleted, err := s.tagRepo.DeleteTagsNotInList(config.Name, repoName, tagsResp.Tags)
	if err != nil {
		log.Printf("Warning: failed to delete removed tags: %v", err)
	} else if rowsDeleted > 0 {
		log.Printf("Deleted %d removed tag(s) from %s (SQL-based)", rowsDeleted, repoName)
	}

	// Get existing tags with digests from database (for changed detection)
	existingTagDigests, err := s.tagRepo.FindWithDigestsByRepo(config.Name, repoName)
	if err != nil {
		return fmt.Errorf("failed to query existing tags: %w", err)
	}

	// Compute new and changed tags
	var newTags []string
	var changedTags []string
	var unchangedTags []string

	for _, tagName := range tagsResp.Tags {
		existingDigest, exists := existingTagDigests[tagName]
		if !exists {
			newTags = append(newTags, tagName)
		} else {
			// Use HEAD to check if digest changed
			if s.hasTagChanged(ctx, client, repoName, tagName, existingDigest) {
				changedTags = append(changedTags, tagName)
			} else {
				unchangedTags = append(unchangedTags, tagName)
			}
		}
	}

	log.Printf("Tags sync for '%s/%s': %d new, %d changed, %d unchanged, %d removed",
		config.Name, repoName, len(newTags), len(changedTags), len(unchangedTags), rowsDeleted)

	// Sync new and changed tags only (unchanged are skipped - differential optimization)
	tagsToSync := make([]string, 0, len(newTags)+len(changedTags))
	tagsToSync = append(tagsToSync, newTags...)
	tagsToSync = append(tagsToSync, changedTags...)
	for _, tagName := range tagsToSync {
		if err := s.syncTag(ctx, client, config, repoName, tagName); err != nil {
			log.Printf("Error syncing tag %s/%s:%s: %v", config.Name, repoName, tagName, err)
			// Continue with other tags
			continue
		}
	}

	return nil
}

// syncTag syncs a single tag's manifest
func (s *SyncService) syncTag(ctx context.Context, client registry.Client, config registry.RegistryConfig, repoName, tagName string) error {
	// Fetch manifest with multi-arch accept header
	manifestResp, err := client.GetManifest(ctx, repoName, tagName, &registry.ManifestOpts{
		Accept: "application/vnd.docker.distribution.manifest.v2+json," +
			"application/vnd.docker.distribution.manifest.list.v2+json," +
			"application/vnd.oci.image.manifest.v1+json," +
			"application/vnd.oci.image.index.v1+json",
	})
	if err != nil {
		return fmt.Errorf("failed to get manifest: %w", err)
	}

	// Use ContentDigest from header (canonical digest)
	manifestDigest := manifestResp.ContentDigest
	if manifestDigest == "" {
		return fmt.Errorf("manifest digest not found in response headers")
	}

	// Detect if this is a manifest list (multi-arch)
	isManifestList := strings.Contains(manifestResp.MediaType, "manifest.list") ||
		strings.Contains(manifestResp.MediaType, "image.index")

	log.Printf("Syncing %s/%s:%s digest=%s multi-arch=%v",
		config.Name, repoName, tagName, manifestDigest, isManifestList)

	// Get or create database records (registry, repo) and process manifest
	return s.db.Transaction(func(tx *gorm.DB) error {
		// Get or create registry and repository
		_, dbRepo, err := s.getOrCreateRepoReferences(tx, config, repoName)
		if err != nil {
			return fmt.Errorf("failed to get/create repo references: %w", err)
		}

		if isManifestList {
			// MULTI-ARCH PATH: Process manifest list + platform manifests
			return s.processMultiArchManifest(ctx, tx, client, config, repoName, tagName, manifestResp, manifestDigest, dbRepo.ID)
		}

		// SINGLE-ARCH PATH: Process single manifest
		return s.processSingleArchManifest(ctx, tx, client, repoName, tagName, manifestResp, manifestDigest, dbRepo.ID)
	})
}
