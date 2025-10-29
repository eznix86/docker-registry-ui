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

// Database wraps gorm.DB with migration capabilities
type Database struct {
	*gorm.DB
	migrationFS embed.FS
}

// NewDatabase creates a new database connection and runs migrations
func NewDatabase(migrationFS embed.FS, databasePath string) (*gorm.DB, error) {

	result, err := ensureDatabasePathExists(databasePath)
	if err != nil {
		return result, err
	}

	// Build connection string with pragmas
	// CRITICAL: foreign_keys=ON enables CASCADE deletes
	dsn := fmt.Sprintf("%s?_journal_mode=WAL&_foreign_keys=ON&_busy_timeout=10000&_synchronous=NORMAL", databasePath)

	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	database := &Database{
		DB:          db,
		migrationFS: migrationFS,
	}

	if err := database.Migrate(); err != nil {
		return nil, err
	}

	if err := database.ConfigureConnectionPool(); err != nil {
		return nil, err
	}

	if err := database.Optimize(); err != nil {
		return nil, err
	}

	log.Println("Database initialized and migrations applied successfully")

	return db, nil
}

func ensureDatabasePathExists(databasePath string) (*gorm.DB, error) {
	dbDir := filepath.Dir(databasePath)
	if dbDir != "" && dbDir != "." {
		if _, err := os.Stat(dbDir); os.IsNotExist(err) {
			if err := os.MkdirAll(dbDir, 0750); err != nil {
				return nil, fmt.Errorf("failed to create database directory %s: %w", dbDir, err)
			}
			log.Printf("Created database directory: %s\n", dbDir)
		}
	}
	return nil, nil
}

// Migrate runs all pending migrations
func (d *Database) Migrate() error {
	sqlDB, err := d.DB.DB()
	if err != nil {
		return fmt.Errorf("failed to get sql.DB: %w", err)
	}

	goose.SetBaseFS(d.migrationFS)

	if err := goose.SetDialect("sqlite3"); err != nil {
		return fmt.Errorf("failed to set dialect: %w", err)
	}

	if err := goose.Up(sqlDB, "database/migrations"); err != nil {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	return nil
}

// ConfigureConnectionPool configures the connection pool for SQLite
func (d *Database) ConfigureConnectionPool() error {
	sqlDB, err := d.DB.DB()
	if err != nil {
		return fmt.Errorf("failed to get sql.DB: %w", err)
	}

	sqlDB.SetMaxOpenConns(1)
	sqlDB.SetMaxIdleConns(1)
	sqlDB.SetConnMaxLifetime(0) // No connection lifetime limit

	log.Println("Database connection pool configured successfully")
	return nil
}

// Optimize configures additional SQLite pragmas for better performance
// Note: foreign_keys, journal_mode, busy_timeout, and synchronous are set in the connection string
func (d *Database) Optimize() error {
	pragmas := []string{
		"PRAGMA auto_vacuum = INCREMENTAL", // Enables incremental vacuum to reclaim unused space
		"PRAGMA cache_size = -64000",       // 64MB cache (negative = kilobytes)
		"PRAGMA mmap_size = 268435456",     // 256MB memory-mapped I/O
		"PRAGMA temp_store = MEMORY",       // Stores temporary tables and indices in RAM
	}

	for _, pragma := range pragmas {
		if err := d.DB.Exec(pragma).Error; err != nil {
			return fmt.Errorf("failed to execute pragma %s: %w", pragma, err)
		}
	}

	log.Println("Database optimizations applied successfully")
	return nil
}
