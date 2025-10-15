// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

package main

import (
	"fmt"
	"os"

	"github.com/brianvoe/gofakeit/v7"
	"github.com/eznix86/docker-registry-ui/internal/factories"
	"github.com/eznix86/docker-registry-ui/internal/models"
	"github.com/eznix86/docker-registry-ui/internal/repository"
	"github.com/spf13/cobra"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func ensureDatabaseDir(dir string) error {
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		if err := os.MkdirAll(dir, 0750); err != nil {
			return fmt.Errorf("failed to create directory %s: %w", dir, err)
		}
		fmt.Printf("Created database directory: %s\n", dir)
	}
	return nil
}

var seedCmd = &cobra.Command{
	Use:   "seed",
	Short: "Seed the database with test data",
	Long:  `Populate the database with sample data for testing and development.`,
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println("Seeding database...")

		// Ensure database directory exists
		if err := ensureDatabaseDir("database"); err != nil {
			fmt.Printf("Failed to create database directory: %v\n", err)
			return
		}

		db, err := gorm.Open(sqlite.Open("database/database.db"), &gorm.Config{})
		if err != nil {
			fmt.Printf("Failed to connect to database: %v\n", err)
			return
		}

		// Clear existing data
		fmt.Println("Clearing existing data...")
		db.Exec("DELETE FROM manifest_layers")
		db.Exec("DELETE FROM manifests")
		db.Exec("DELETE FROM tags")
		db.Exec("DELETE FROM repositories")
		db.Exec("DELETE FROM registries")
		db.Exec("DELETE FROM repository_stats")
		db.Exec("DELETE FROM tag_details")

		// Auto-migrate all models
		err = db.AutoMigrate(
			&models.Registry{},
			&models.Repository{},
			&models.Tag{},
			&models.Manifest{},
			&models.ManifestLayer{},
		)

		if err != nil {
			fmt.Printf("Failed to auto-migrate models: %v\n", err)
			return
		}

		err = gofakeit.Seed(0)

		if err != nil {
			fmt.Printf("Failed to seed gofakeit: %v\n", err)
			return
		}

		fmt.Println("Creating registries...")
		registries := factories.NewRegistryFactory(db).Count(5).Create()

		fmt.Println("Creating repositories...")
		var repositories []*models.Repository
		var untaggedRepos []*models.Repository
		var minimalRepos []*models.Repository

		for _, registry := range registries {
			// Regular repositories with many tags
			repoCount := gofakeit.Number(3, 6)
			repos := factories.NewRepositoryFactory(db).
				WithRegistry(registry.ID).
				Count(repoCount).
				Create()
			repositories = append(repositories, repos...)

			// Add 1-2 untagged repositories per registry (edge case testing)
			untagged := factories.NewRepositoryFactory(db).
				WithRegistry(registry.ID).
				Count(gofakeit.Number(1, 2)).
				Create()
			untaggedRepos = append(untaggedRepos, untagged...)

			// Add 1 minimal repository (1 tag, 1 arch) per registry
			minimal := factories.NewRepositoryFactory(db).
				WithRegistry(registry.ID).
				Count(1).
				Create()
			minimalRepos = append(minimalRepos, minimal...)
		}

		fmt.Println("Creating single-arch manifests...")
		singleArchManifests := factories.NewManifestFactory(db).Count(500).Create()

		fmt.Println("Creating multi-arch manifests with platform-specific manifests...")
		var multiArchManifests []*models.Manifest
		var allManifests []*models.Manifest
		var minimalManifests []*models.Manifest // Single-arch manifests for minimal repos

		allManifests = append(allManifests, singleArchManifests...)

		multiArchCount := 100
		for i := 0; i < multiArchCount; i++ {
			multiArchManifest := factories.NewMultiArchManifestFactory(db).Create()[0]
			multiArchManifests = append(multiArchManifests, multiArchManifest)
			allManifests = append(allManifests, multiArchManifest)

			platformCount := gofakeit.Number(2, 4)
			for j := 0; j < platformCount; j++ {
				platformManifest := factories.NewManifestFactory(db).
					WithManifestList(multiArchManifest.Digest).
					Create()[0]
				allManifests = append(allManifests, platformManifest)
			}
		}

		// Create single-arch manifests specifically for minimal repos (1 arch only)
		fmt.Println("Creating single-arch manifests for minimal repositories...")
		minimalManifests = factories.NewManifestFactory(db).Count(len(minimalRepos)).Create()

		fmt.Println("Creating tags...")
		var tags []*models.Tag

		// Regular repositories: 200-250 tags each
		for _, repo := range repositories {
			tagCount := gofakeit.Number(200, 250)
			repoTags := factories.NewTagFactory(db).
				WithRepository(repo.ID).
				Count(tagCount).
				Create()
			tags = append(tags, repoTags...)
		}

		// Minimal repositories: exactly 1 tag each (for testing single-tag repos)
		fmt.Println("Creating minimal repositories with 1 tag each...")
		var minimalTags []*models.Tag
		for _, repo := range minimalRepos {
			repoTags := factories.NewTagFactory(db).
				WithRepository(repo.ID).
				Count(1).
				Create()
			minimalTags = append(minimalTags, repoTags...)
		}

		// Untagged repositories: 0 tags (they stay empty)
		fmt.Printf("Created %d untagged repositories for edge case testing\n", len(untaggedRepos))

		fmt.Println("Linking tags to manifests...")
		// Link regular tags to all available manifests (multi-arch and single-arch)
		for i := range tags {
			manifestIdx := i % len(allManifests)
			tags[i].Digest = allManifests[manifestIdx].Digest
			db.Save(tags[i])
		}

		// Link minimal tags to single-arch manifests only (1 tag = 1 arch)
		fmt.Println("Linking minimal repository tags to single-arch manifests...")
		for i, tag := range minimalTags {
			tag.Digest = minimalManifests[i].Digest
			db.Save(tag)
		}

		fmt.Println("Creating manifest layers...")
		for _, manifest := range allManifests {
			if manifest.OS != "" && manifest.Architecture != "" {
				layerCount := gofakeit.Number(3, 12)
				factories.NewManifestLayerFactory(db).
					WithManifest(manifest.Digest).
					Count(layerCount).
					Create()
			}
		}

		// Create layers for minimal manifests too
		fmt.Println("Creating layers for minimal manifests...")
		for _, manifest := range minimalManifests {
			if manifest.OS != "" && manifest.Architecture != "" {
				layerCount := gofakeit.Number(3, 8)
				factories.NewManifestLayerFactory(db).
					WithManifest(manifest.Digest).
					Count(layerCount).
					Create()
			}
		}

		fmt.Println("Refreshing cache tables...")
		cacheRepo := repository.NewCacheRepository(db)
		if err := cacheRepo.RefreshAll(); err != nil {
			fmt.Printf("Failed to refresh cache: %v\n", err)
			return
		}

		fmt.Println("\n=== Seeding Summary ===")
		fmt.Printf("Registries: %d\n", len(registries))
		fmt.Printf("Regular repositories: %d (200-250 tags each)\n", len(repositories))
		fmt.Printf("Minimal repositories: %d (1 tag, 1 arch each)\n", len(minimalRepos))
		fmt.Printf("Untagged repositories: %d (0 tags - edge case)\n", len(untaggedRepos))
		fmt.Printf("Total tags: %d\n", len(tags)+len(minimalTags))
		fmt.Printf("Single-arch manifests: %d\n", len(singleArchManifests))
		fmt.Printf("Multi-arch manifests: %d\n", len(multiArchManifests))
		fmt.Println("\nSeeding completed successfully!")
	},
}
