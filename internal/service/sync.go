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
	"encoding/json"
	"fmt"
	"log"
	"strings"

	"github.com/eznix86/docker-registry-ui/internal/models"
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
	manifestRepo *repository.ManifestRepository
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
		manifestRepo: repository.NewManifestRepository(db),
		cacheRepo:    repository.NewCacheRepository(db),
		registryMgr:  nil, // Will be initialized in SyncAllRegistries
	}
}

// SyncAllRegistries synchronizes all configured registries
func (s *SyncService) SyncAllRegistries(ctx context.Context, configs []registry.RegistryConfig) error {
	log.Printf("Starting sync for %d registries", len(configs))

	// Initialize registry manager with configs
	var err error
	s.registryMgr, err = registry.NewManager(configs)
	if err != nil {
		return fmt.Errorf("failed to create registry manager: %w", err)
	}

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
			s.updateRegistryStatus(config.Name, statusCode)
			continue
		}
		s.updateRegistryStatus(config.Name, statusCode)
	}

	log.Printf("Refreshing dirty cache...")
	if err := s.cacheRepo.RefreshAllDirty(); err != nil {
		log.Printf("Warning: cache refresh failed: %v", err)
	} else {
		log.Printf("Cache refreshed successfully")
	}

	log.Printf("Sync completed for all registries")
	return nil
}

// If host changes for existing registry name, all old repos are CASCADE deleted
func (s *SyncService) ensureRegistryExists(config registry.RegistryConfig) {
	// Strip scheme from URL to get host
	host := config.URL
	host = strings.TrimPrefix(host, "http://")
	host = strings.TrimPrefix(host, "https://")

	var existing models.Registry
	err := s.db.Where("name = ?", config.Name).First(&existing).Error

	if err != nil {
		// Registry doesn't exist - create it
		registry := &models.Registry{
			Name: config.Name,
			Host: host,
		}
		if err := s.db.Create(registry).Error; err != nil {
			log.Printf("Warning: failed to create registry '%s': %v", config.Name, err)
		}
		return
	}

	// Registry exists - check if host changed
	if existing.Host != host {
		log.Printf("Registry '%s' host changed from '%s' to '%s' - deleting old data",
			config.Name, existing.Host, host)

		// Delete the registry (CASCADE will delete all repos/tags/manifests)
		if err := s.registryRepo.DeleteByName(config.Name); err != nil {
			log.Printf("Warning: failed to delete old registry '%s': %v", config.Name, err)
		}

		registry := &models.Registry{
			Name: config.Name,
			Host: host,
		}
		if err := s.db.Create(registry).Error; err != nil {
			log.Printf("Warning: failed to create registry '%s' with new host: %v", config.Name, err)
		}
	}
}

func (s *SyncService) updateRegistryStatus(registryName string, status int) {
	if err := s.db.Model(&models.Registry{}).
		Where("name = ?", registryName).
		Update("last_status", status).Error; err != nil {
		log.Printf("Warning: failed to update registry status for '%s': %v", registryName, err)
	}
}

func (s *SyncService) extractHTTPStatus(err error) int {
	if err == nil {
		return 200
	}

	errStr := err.Error()

	// Common HTTP error patterns
	if strings.Contains(errStr, "401") || strings.Contains(errStr, "unauthorized") {
		return 401
	}
	if strings.Contains(errStr, "403") || strings.Contains(errStr, "forbidden") {
		return 403
	}
	if strings.Contains(errStr, "404") || strings.Contains(errStr, "not found") {
		return 404
	}
	if strings.Contains(errStr, "connection refused") || strings.Contains(errStr, "no such host") {
		return 503 // Service Unavailable
	}
	if strings.Contains(errStr, "timeout") || strings.Contains(errStr, "deadline exceeded") {
		return 504 // Gateway Timeout
	}

	// Default to 500 for unknown errors
	return 500
}

// cleanupRemovedRegistries deletes registries not in config (CASCADE cleans all related data)
func (s *SyncService) cleanupRemovedRegistries(configs []registry.RegistryConfig) error {
	configuredNames := make(map[string]bool)
	for _, config := range configs {
		configuredNames[config.Name] = true
	}

	dbRegistries, err := s.registryRepo.FindAll()
	if err != nil {
		return fmt.Errorf("failed to load database registries: %w", err)
	}

	// Delete registries not in config
	removedCount := 0
	for _, dbRegistry := range dbRegistries {
		if !configuredNames[dbRegistry.Name] {
			log.Printf("Removing registry '%s' (no longer in environment config)", dbRegistry.Name)
			if err := s.registryRepo.DeleteByName(dbRegistry.Name); err != nil {
				log.Printf("Failed to delete registry '%s': %v", dbRegistry.Name, err)
			} else {
				log.Printf("Deleted registry '%s' and all related data", dbRegistry.Name)
				removedCount++
			}
		}
	}

	if removedCount > 0 {
		log.Printf("Removed %d registry(ies) from database", removedCount)
	}

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

// hasTagChanged checks if a tag has changed using HEAD request
func (s *SyncService) hasTagChanged(ctx context.Context, client registry.Client, repoName, tagName, existingDigest string) bool {
	head, err := client.HeadManifest(ctx, repoName, tagName, nil)
	if err != nil {
		log.Printf("HEAD request failed for %s:%s: %v (treating as changed)", repoName, tagName, err)
		return true // Treat error as changed to trigger re-sync
	}
	return head.ContentDigest != existingDigest
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

// getOrCreateRepoReferences ensures registry and repository exist in DB
func (s *SyncService) getOrCreateRepoReferences(tx *gorm.DB, config registry.RegistryConfig, repoName string) (*models.Registry, *models.Repository, error) {
	// Strip scheme from URL to get host
	host := config.URL
	host = strings.TrimPrefix(host, "http://")
	host = strings.TrimPrefix(host, "https://")

	// Get or create registry
	dbRegistry := &models.Registry{
		Name: config.Name,
		Host: host,
	}
	if err := tx.FirstOrCreate(dbRegistry, models.Registry{Host: host}).Error; err != nil {
		return nil, nil, fmt.Errorf("failed to get/create registry: %w", err)
	}

	// Get or create repository
	dbRepo := &models.Repository{
		RegistryID: dbRegistry.ID,
		Name:       repoName,
	}
	if err := tx.Where("registry_id = ? AND name = ?", dbRegistry.ID, repoName).
		FirstOrCreate(dbRepo).Error; err != nil {
		return nil, nil, fmt.Errorf("failed to get/create repository: %w", err)
	}

	return dbRegistry, dbRepo, nil
}

// multiArchParams contains parameters for processing multi-arch manifests
type multiArchParams struct {
	ctx                context.Context
	tx                 *gorm.DB
	client             registry.Client
	repoName           string
	manifestListResp   *registry.ManifestResponse
	manifestListDigest string
	repoID             uint
}

// savePlatformManifests processes and saves all platform manifests
func (s *SyncService) savePlatformManifests(params multiArchParams) (int64, error) {
	// Parse platform manifests from manifest list
	var platformManifests []struct {
		MediaType string `json:"mediaType"`
		Size      int64  `json:"size"`
		Digest    string `json:"digest"`
		Platform  struct {
			Architecture string `json:"architecture"`
			OS           string `json:"os"`
		} `json:"platform"`
	}

	if params.manifestListResp.Raw != nil {
		if manifestsField, ok := params.manifestListResp.Raw["manifests"]; ok {
			manifestsJSON, _ := json.Marshal(manifestsField)
			if err := json.Unmarshal(manifestsJSON, &platformManifests); err != nil {
				return 0, fmt.Errorf("failed to parse platform manifests: %w", err)
			}
		}
	}

	log.Printf("Found %d platform manifests in list", len(platformManifests))

	// Process each platform manifest
	var totalSize int64
	for _, pm := range platformManifests {
		size, err := s.processSinglePlatformManifest(params, pm)
		if err != nil {
			log.Printf("Warning: failed to process platform manifest %s: %v", pm.Digest, err)
			continue
		}
		totalSize += size
	}

	return totalSize, nil
}

// processSinglePlatformManifest processes one platform-specific manifest
func (s *SyncService) processSinglePlatformManifest(params multiArchParams, pm struct {
	MediaType string `json:"mediaType"`
	Size      int64  `json:"size"`
	Digest    string `json:"digest"`
	Platform  struct {
		Architecture string `json:"architecture"`
		OS           string `json:"os"`
	} `json:"platform"`
}) (int64, error) {
	// Fetch platform manifest
	platformManifestResp, err := params.client.GetManifest(params.ctx, params.repoName, pm.Digest, nil)
	if err != nil {
		return 0, fmt.Errorf("failed to fetch platform manifest: %w", err)
	}

	// Fetch config blob for creation time
	var configBlob registry.ConfigBlob
	if platformManifestResp.Config.Digest != "" {
		blobResp, err := params.client.GetBlob(params.ctx, params.repoName, platformManifestResp.Config.Digest)
		if err != nil {
			log.Printf("Warning: failed to fetch config blob: %v", err)
		} else {
			if err := json.Unmarshal(blobResp.Data, &configBlob); err != nil {
				log.Printf("Warning: failed to parse config blob: %v", err)
			}
		}
	}

	// Calculate platform manifest size
	var layerSize int64
	for _, layer := range platformManifestResp.Layers {
		layerSize += layer.Size
	}

	// Create platform manifest record (HAS os/arch, HAS parent)
	platformRecord := &models.Manifest{
		Digest:             pm.Digest,
		MediaType:          pm.MediaType,
		OS:                 pm.Platform.OS,
		Architecture:       pm.Platform.Architecture,
		ManifestListDigest: &params.manifestListDigest,
		SizeBytes:          layerSize,
		Created:            configBlob.Created,
	}

	if err := params.tx.Save(platformRecord).Error; err != nil {
		return 0, fmt.Errorf("failed to save platform manifest: %w", err)
	}

	// Save layers for this platform manifest
	if err := s.saveLayers(params.tx, pm.Digest, platformManifestResp.Layers); err != nil {
		return 0, fmt.Errorf("failed to save layers: %w", err)
	}

	log.Printf("Saved platform manifest: digest=%s os=%s arch=%s size=%d",
		pm.Digest, pm.Platform.OS, pm.Platform.Architecture, layerSize)

	return layerSize, nil
}

// processMultiArchManifest handles manifest lists with platform-specific manifests
func (s *SyncService) processMultiArchManifest(ctx context.Context, tx *gorm.DB, client registry.Client, config registry.RegistryConfig, repoName, tagName string, manifestListResp *registry.ManifestResponse, manifestListDigest string, repoID uint) error {
	// Create or update manifest list record (NO os/arch, NO parent)
	manifestListRecord := &models.Manifest{
		Digest:             manifestListDigest,
		MediaType:          manifestListResp.MediaType,
		OS:                 "",
		Architecture:       "",
		ManifestListDigest: nil,
		SizeBytes:          0,
		Created:            "",
	}

	if err := tx.Save(manifestListRecord).Error; err != nil {
		return fmt.Errorf("failed to save manifest list: %w", err)
	}

	log.Printf("Saved manifest list: digest=%s", manifestListDigest)

	// Process all platform manifests using helper
	params := multiArchParams{
		ctx:                ctx,
		tx:                 tx,
		client:             client,
		repoName:           repoName,
		manifestListResp:   manifestListResp,
		manifestListDigest: manifestListDigest,
		repoID:             repoID,
	}

	totalSize, err := s.savePlatformManifests(params)
	if err != nil {
		return err
	}

	// Update manifest list with total size
	if err := tx.Model(&models.Manifest{}).
		Where("digest = ?", manifestListDigest).
		Update("size_bytes", totalSize).Error; err != nil {
		log.Printf("Warning: failed to update manifest list size: %v", err)
	}

	// Create or update tag pointing to manifest list
	return s.saveTag(tx, repoID, tagName, manifestListDigest)
}

// processSingleArchManifest handles single-architecture manifests
func (s *SyncService) processSingleArchManifest(ctx context.Context, tx *gorm.DB, client registry.Client, repoName, tagName string, manifestResp *registry.ManifestResponse, manifestDigest string, repoID uint) error {
	// Fetch config blob for creation time and platform info
	var configBlob registry.ConfigBlob
	if manifestResp.Config.Digest != "" {
		blobResp, err := client.GetBlob(ctx, repoName, manifestResp.Config.Digest)
		if err != nil {
			log.Printf("Warning: failed to fetch config blob: %v", err)
		} else {
			if err := json.Unmarshal(blobResp.Data, &configBlob); err != nil {
				log.Printf("Warning: failed to parse config blob: %v", err)
			}
		}
	}

	// Calculate manifest size (sum of layer sizes)
	var totalSize int64
	for _, layer := range manifestResp.Layers {
		totalSize += layer.Size
	}

	// Create manifest record
	manifestRecord := &models.Manifest{
		Digest:             manifestDigest,
		MediaType:          manifestResp.MediaType,
		OS:                 configBlob.OS,
		Architecture:       configBlob.Architecture,
		ManifestListDigest: nil, // Single-arch has no parent
		SizeBytes:          totalSize,
		Created:            configBlob.Created,
	}

	if err := tx.Save(manifestRecord).Error; err != nil {
		return fmt.Errorf("failed to save manifest: %w", err)
	}

	// Save layers
	if err := s.saveLayers(tx, manifestDigest, manifestResp.Layers); err != nil {
		return fmt.Errorf("failed to save layers: %w", err)
	}

	log.Printf("Saved single-arch manifest: digest=%s os=%s arch=%s size=%d",
		manifestDigest, configBlob.OS, configBlob.Architecture, totalSize)

	// Create or update tag
	return s.saveTag(tx, repoID, tagName, manifestDigest)
}

// saveLayers saves manifest layers to database
func (s *SyncService) saveLayers(tx *gorm.DB, manifestDigest string, layers []registry.ManifestLayer) error {
	// Delete existing layers for this manifest
	if err := tx.Where("manifest_digest = ?", manifestDigest).Delete(&models.ManifestLayer{}).Error; err != nil {
		return fmt.Errorf("failed to delete existing layers: %w", err)
	}

	// Insert new layers
	for _, layer := range layers {
		layerRecord := &models.ManifestLayer{
			ManifestDigest: manifestDigest,
			LayerDigest:    layer.Digest,
			SizeBytes:      layer.Size,
		}
		if err := tx.Create(layerRecord).Error; err != nil {
			return fmt.Errorf("failed to save layer: %w", err)
		}
	}

	return nil
}

// saveTag saves or updates a tag
func (s *SyncService) saveTag(tx *gorm.DB, repoID uint, tagName, digest string) error {
	tag := &models.Tag{
		RepoID: repoID,
		Name:   tagName,
		Digest: digest,
	}

	// Upsert tag
	if err := tx.Where("repo_id = ? AND name = ?", repoID, tagName).
		Assign(models.Tag{Digest: digest}).
		FirstOrCreate(tag).Error; err != nil {
		return fmt.Errorf("failed to save tag: %w", err)
	}

	log.Printf("Saved tag: %s -> %s", tagName, digest)
	return nil
}
