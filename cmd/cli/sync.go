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
	"github.com/eznix86/docker-registry-ui/internal/service"
	"github.com/eznix86/docker-registry-ui/pkg/registry"
	"github.com/spf13/cobra"
)

var SyncCmd = &cobra.Command{
	Use:   "sync",
	Short: "Synchronize registry data",
	Long:  `Synchronize catalog, tags, and manifests from all configured registries.`,
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println("Starting registry synchronization...")

		database, err := config.NewDatabase(assets.MigrationsFS, "database/database.db")
		if err != nil {
			fmt.Printf("Failed to connect to database: %v\n", err)
			return
		}

		// Load registry configs
		configs, err := registry.LoadRegistryConfigs()
		if err != nil {
			fmt.Printf("Failed to load registry configs: %v\n", err)
			return
		}

		fmt.Printf("Found %d registry configuration(s)\n", len(configs))

		// Create sync service
		syncService := service.NewSyncService(database)

		// Execute sync directly
		ctx := cmd.Context()
		if err := syncService.SyncAllRegistries(ctx, configs); err != nil {
			fmt.Printf("✗ Sync failed: %v\n", err)
			return
		}

		fmt.Println("\nSync completed successfully!")
	},
}
