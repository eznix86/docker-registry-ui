// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

package config

import (
	"embed"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/pressly/goose/v3"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func NewDatabase(migrationFS embed.FS, databasePath string) (*gorm.DB, error) {
	dbDir := filepath.Dir(databasePath)
	if dbDir != "" && dbDir != "." {
		if _, err := os.Stat(dbDir); os.IsNotExist(err) {
			if err := os.MkdirAll(dbDir, 0750); err != nil {
				return nil, fmt.Errorf("failed to create database directory %s: %w", dbDir, err)
			}
			log.Printf("Created database directory: %s\n", dbDir)
		}
	}

	db, err := gorm.Open(sqlite.Open(databasePath), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get sql.DB: %w", err)
	}

	goose.SetBaseFS(migrationFS)

	err = goose.SetDialect("sqlite3")

	if err != nil {
		return nil, fmt.Errorf("failed to set dialect: %w", err)
	}

	if err := goose.Up(sqlDB, "database/migrations"); err != nil {
		return nil, fmt.Errorf("failed to run migrations: %w", err)
	}

	log.Println("Database initialized and migrations applied successfully")

	return db, nil
}
