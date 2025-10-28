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

package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	assets "github.com/eznix86/docker-registry-ui"
	"github.com/eznix86/docker-registry-ui/internal/config"
	"github.com/spf13/cobra"
)

var serveCmd = &cobra.Command{
	Use:   "serve",
	Short: "Start the HTTP server",
	Long:  `Start the Docker Registry UI HTTP server with graceful shutdown support.`,
	Run: func(cmd *cobra.Command, args []string) {
		cfg := config.DefaultConfig()

		app, err := config.NewApplication(assets.PublicFS, assets.MigrationsFS, cfg)

		if err != nil {
			log.Fatalf("Failed to initialize application: %v", err)
		}

		quit := make(chan os.Signal, 1)
		signal.Notify(quit, os.Interrupt, syscall.SIGTERM)

		go func() {
			if err := app.Start(); err != nil && err != http.ErrServerClosed {
				log.Fatalf("Server failed: %v", err)
			}
		}()

		fmt.Println("Server is running. Press Ctrl+C to stop.")

		<-quit
		fmt.Println("\nReceived shutdown signal...")

		ctx, cancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
		defer cancel()

		if err := app.Shutdown(ctx); err != nil {
			log.Fatalf("Forced shutdown: %v", err)
		}

		fmt.Println("Server exited")
	},
}
