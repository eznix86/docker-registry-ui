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
	"context"
	"fmt"
	"os"
	"os/signal"
	"strconv"
	"syscall"

	assets "github.com/eznix86/docker-registry-ui"
	"github.com/eznix86/docker-registry-ui/internal/config"
	"github.com/eznix86/docker-registry-ui/internal/repository"
	"github.com/eznix86/docker-registry-ui/internal/service"
	"github.com/eznix86/docker-registry-ui/pkg/registry"
	"github.com/spf13/cobra"
)

var WorkerCmd = &cobra.Command{
	Use:   "worker",
	Short: "Start background workers to process sync jobs",
	Long:  `Start a pool of workers that continuously process registry synchronization jobs from the database queue.`,
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println("Starting sync workers...")

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

		fmt.Printf("Loaded %d registry configuration(s)\n", len(configs))

		// Create registry manager
		registryMgr, err := registry.NewManager(configs)
		if err != nil {
			fmt.Printf("Failed to create registry manager: %v\n", err)
			return
		}

		// Get number of workers from environment (default: 4)
		numWorkers := 4
		if workersEnv := os.Getenv("SYNC_WORKERS"); workersEnv != "" {
			if n, err := strconv.Atoi(workersEnv); err == nil && n > 0 {
				numWorkers = n
			}
		}

		fmt.Printf("Worker pool size: %d (configure with SYNC_WORKERS env var)\n", numWorkers)

		// Create repositories and worker pool
		jobRepo := repository.NewSyncJobRepository(database.DB)
		repoRepo := repository.NewRepositoryRepository(database.DB)
		tagRepo := repository.NewTagRepository(database.DB)
		registryRepo := repository.NewRegistryRepository(database.DB)
		manifestRepo := repository.NewManifestRepository(database.DB)
		cacheRepo := repository.NewCacheRepository(database.DB)
		workerPool := service.NewWorkerPool(numWorkers, jobRepo, repoRepo, tagRepo, registryRepo, manifestRepo, cacheRepo, registryMgr)

		// Create context for graceful shutdown
		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()

		// Start workers
		workerPool.Start(ctx)

		// Wait for interrupt signal
		fmt.Println("\nWorkers running. Press Ctrl+C to stop.")
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
		<-sigChan

		fmt.Println("\n\nReceived shutdown signal. Stopping workers...")
		cancel() // Cancel context
		workerPool.Stop()

		fmt.Println("Workers stopped successfully.")
	},
}
