// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/eznix86/docker-registry-ui/internal/config"
	"github.com/spf13/cobra"
)

var serveCmd = &cobra.Command{
	Use:   "serve",
	Short: "Start the HTTP server",
	Long:  `Start the Docker Registry UI HTTP server with graceful shutdown support.`,
	Run: func(cmd *cobra.Command, args []string) {
		cfg := config.DefaultConfig()

		app, err := config.NewApplication(publicFS, migrationsFS, cfg)

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
