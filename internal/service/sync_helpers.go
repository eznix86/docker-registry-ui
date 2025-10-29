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

	"github.com/eznix86/docker-registry-ui/internal/models"
	"github.com/eznix86/docker-registry-ui/pkg/registry"
	"gorm.io/gorm"
)

// extractHostFromURL removes http:// or https:// prefix from URL
func extractHostFromURL(url string) string {
	host := url
	host = strings.TrimPrefix(host, "http://")
	host = strings.TrimPrefix(host, "https://")
	return host
}

// ensureRegistryExists creates or updates a registry record in the database
// If host changes for existing registry name, all old repos are CASCADE deleted
func (s *SyncService) ensureRegistryExists(config registry.RegistryConfig) {
	// Strip scheme from URL to get host
	host := extractHostFromURL(config.URL)

	var existing models.Registry
	err := s.db.Where("name = ?", config.Name).First(&existing).Error

	if err != nil {
		// Registry doesn't exist - create it
		if err == gorm.ErrRecordNotFound {
			newRegistry := models.Registry{
				Name:   config.Name,
				Host:   host,
				Status: 0,
			}
			if err := s.db.Create(&newRegistry).Error; err != nil {
				log.Printf("Warning: failed to create registry '%s': %v", config.Name, err)
			} else {
				log.Printf("Created registry '%s' with host '%s'", config.Name, host)
			}
			return
		}
		log.Printf("Warning: failed to check registry '%s': %v", config.Name, err)
		return
	}

	// Registry exists - check if host changed
	if existing.Host != host {
		log.Printf("Warning: Registry '%s' host changed from '%s' to '%s' - updating and CASCADE deleting all old repos",
			config.Name, existing.Host, host)
		if err := s.db.Model(&existing).Update("host", host).Error; err != nil {
			log.Printf("Warning: failed to update host for registry '%s': %v", config.Name, err)
		}
	}

	// Registry exists with same host - if name differs, attempt create
	if existing.Name != config.Name {
		newRegistry := models.Registry{
			Name:   config.Name,
			Host:   host,
			Status: 0,
		}
		if err := s.db.Create(&newRegistry).Error; err != nil {
			log.Printf("Warning: failed to create registry '%s' with new host: %v", config.Name, err)
		}
	}
}

// updateRegistryStatus updates the last_status field for a registry
func (s *SyncService) updateRegistryStatus(registryName string, status int) error {
	return s.db.Model(&models.Registry{}).
		Where("name = ?", registryName).
		Update("last_status", status).Error
}

// extractHTTPStatus attempts to extract HTTP status code from error messages
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

// getOrCreateRepoReferences ensures registry and repository exist in DB
func (s *SyncService) getOrCreateRepoReferences(tx *gorm.DB, config registry.RegistryConfig, repoName string) (*models.Registry, *models.Repository, error) {
	// Strip scheme from URL to get host
	host := extractHostFromURL(config.URL)

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
	if err := tx.FirstOrCreate(dbRepo, models.Repository{RegistryID: dbRegistry.ID, Name: repoName}).Error; err != nil {
		return nil, nil, fmt.Errorf("failed to get/create repository: %w", err)
	}

	return dbRegistry, dbRepo, nil
}

// hasTagChanged checks if a tag's digest has changed using HEAD request
func (s *SyncService) hasTagChanged(ctx context.Context, client registry.Client, repoName, tagName, existingDigest string) bool {
	head, err := client.HeadManifest(ctx, repoName, tagName, nil)
	if err != nil {
		log.Printf("HEAD request failed for %s:%s: %v (treating as changed)", repoName, tagName, err)
		return true
	}
	return head.ContentDigest != existingDigest
}
