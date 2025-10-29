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

	"github.com/eznix86/docker-registry-ui/internal/models"
	"github.com/eznix86/docker-registry-ui/pkg/registry"
	"gorm.io/gorm"
)

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

// savePlatformManifests processes and saves all platform manifests
func (s *SyncService) savePlatformManifests(params multiArchParams) (int64, error) {
	// Parse platform manifests from manifest list
	var platformManifests []PlatformManifest

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
func (s *SyncService) processSinglePlatformManifest(params multiArchParams, pm PlatformManifest) (int64, error) {
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
