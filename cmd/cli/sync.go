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

package seed

import (
	"fmt"

	assets "github.com/eznix86/docker-registry-ui"
	"github.com/eznix86/docker-registry-ui/internal/config"
	"github.com/eznix86/docker-registry-ui/internal/models"
	"github.com/eznix86/docker-registry-ui/internal/repository"
	"github.com/eznix86/docker-registry-ui/pkg/registry"
	"github.com/spf13/cobra"
)

var SyncCmd = &cobra.Command{
	Use:   "sync",
	Short: "Enqueue registry synchronization jobs",
	Long:  `Enqueue catalog sync jobs for all configured registries. Workers will process these jobs in the background.`,
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println("Enqueueing registry sync jobs...")

		// Connect to database
		database, err := config.Connect(assets.MigrationsFS, "database/database.db")
		if err != nil {
			fmt.Printf("Failed to connect to database: %v\n", err)
			return
		}

		// Run migrations
		if err := database.Migrate(); err != nil {
			fmt.Printf("Failed to run migrations: %v\n", err)
			return
		}

		// Load registry configs
		configs, err := registry.LoadRegistryConfigs()
		if err != nil {
			fmt.Printf("Failed to load registry configs: %v\n", err)
			return
		}

		fmt.Printf("Found %d registry configuration(s)\n", len(configs))

		// Create repositories
		jobRepo := repository.NewSyncJobRepository(database.DB)
		registryRepo := repository.NewRegistryRepository(database.DB)

		// Step 1: Cleanup registries that are no longer in environment config
		dbRegistries, err := registryRepo.FindAll()
		if err != nil {
			fmt.Printf("Failed to load database registries: %v\n", err)
			return
		}

		// Build set of configured registry names
		configuredNames := make(map[string]bool)
		for _, config := range configs {
			configuredNames[config.Name] = true
		}

		// Delete registries not in config (CASCADE will handle all related data)
		removedCount := 0
		for _, dbRegistry := range dbRegistries {
			if !configuredNames[dbRegistry.Name] {
				fmt.Printf("\nRemoving registry '%s' (no longer in environment config)\n", dbRegistry.Name)
				if err := registryRepo.DeleteByName(dbRegistry.Name); err != nil {
					fmt.Printf("✗ Failed to delete registry '%s': %v\n", dbRegistry.Name, err)
				} else {
					fmt.Printf("✓ Deleted registry '%s' and all related data\n", dbRegistry.Name)
					removedCount++
				}
			}
		}

		if removedCount > 0 {
			fmt.Printf("\nRemoved %d registry(ies) from database\n", removedCount)
		}

		// Step 2: Enqueue catalog jobs for each configured registry
		successCount := 0
		for _, config := range configs {
			fmt.Printf("\nProcessing registry '%s' (%s)\n", config.Name, config.URL)

			// Create catalog sync job
			job := &models.SyncJob{
				JobType:      models.JobTypeSyncCatalog,
				RegistryName: config.Name,
				RegistryURL:  config.URL,
				MaxAttempts:  3,
				Priority:     0,
			}

			created, err := jobRepo.EnqueueJob(job)
			if err != nil {
				fmt.Printf("✗ Failed to enqueue job for registry '%s': %v\n", config.Name, err)
				continue
			}

			if created {
				fmt.Printf("✓ Enqueued catalog sync job for registry '%s'\n", config.Name)
				successCount++
			} else {
				fmt.Printf("→ Catalog sync job already exists for registry '%s'\n", config.Name)
			}
		}

		fmt.Printf("\n=== Sync Summary ===\n")
		fmt.Printf("Configured registries: %d\n", len(configs))
		fmt.Printf("Registries removed: %d\n", removedCount)
		fmt.Printf("Jobs enqueued: %d\n", successCount)
		fmt.Printf("\nSync jobs enqueued successfully! Run './ui worker' to process them.\n")
	},
}
