package config

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/eznix86/docker-registry-ui/backend/internal/models"
	"github.com/eznix86/docker-registry-ui/backend/internal/utils"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// DatabaseConfig holds database configuration
type DatabaseConfig struct {
	DBPath string
	Debug  bool
}

// NewDatabase creates and configures a new database connection
func NewDatabase() (*gorm.DB, error) {
	config := &DatabaseConfig{
		DBPath: getDBPath(),
		Debug:  utils.DebugModeEnabled(),
	}
	
	return setupDatabase(config)
}

// getDBPath returns the database file path from environment or default
func getDBPath() string {
	if dbPath := os.Getenv("DATABASE_PATH"); dbPath != "" {
		return dbPath
	}
	return "database/registry.db"
}

func setupDatabase(config *DatabaseConfig) (*gorm.DB, error) {
	// Clean up WAL files on boot
	// if err := cleanupWALFiles(config.DBPath); err != nil {
	// 	log.Printf("Warning: failed to cleanup WAL files: %v", err)
	// }

	// Configure GORM logger
	var gormLogger logger.Interface
	if config.Debug {
		gormLogger = logger.Default.LogMode(logger.Info)
		log.Printf("Database debug mode enabled")
	} else {
		gormLogger = logger.Default.LogMode(logger.Silent)
	}

	// Open database connection
	db, err := gorm.Open(sqlite.Open(config.DBPath), &gorm.Config{
		Logger: gormLogger,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	log.Printf("Connected to SQLite database: %s", config.DBPath)

	// optimize

	enableWalMode(db)

	// Run auto migrations
	if err := runMigrations(db); err != nil {
		return nil, fmt.Errorf("failed to run database migrations: %w", err)
	}

	runtimeOptimization(db)

	log.Println("Database initialization completed successfully")
	return db, nil
}

// enableWalMode configures the database for maximum performance.
// It sets the page size to 32KB, enables write-ahead logging (WAL)
// and enables incremental vacuum mode.
func enableWalMode(db *gorm.DB) {
	db.Exec("PRAGMA page_size = 32768;")
	db.Exec("PRAGMA journal_mode = WAL;")
	db.Exec("PRAGMA auto_vacuum = INCREMENTAL;")
}

// runtimeOptimization applies performance optimizations to the database connection.
// It sets the cache size to 10MB, memory map size to 50MB, enables in-memory temporary storage,
// sets the synchronous mode to NORMAL, and sets the busy timeout to 10 seconds.
func runtimeOptimization(db *gorm.DB) {
	db.Exec("PRAGMA cache_size = 10485760;")
	db.Exec("PRAGMA mmap_size = 52428800;")
	db.Exec("PRAGMA temp_store = MEMORY;")
	db.Exec("PRAGMA synchronous = NORMAL;")
	db.Exec("PRAGMA busy_timeout = 10000;")
}

// runMigrations executes all database migrations
func runMigrations(db *gorm.DB) error {

	log.Println("Running database migrations...")

	// Auto-migrate all models
	err := db.AutoMigrate(
		&models.Registry{},
		&models.Repository{},
		&models.Image{},
		&models.Tag{},
	)

	if err != nil {
		return fmt.Errorf("auto-migration failed: %w", err)
	}

	log.Println("Database migrations completed")	
	return nil
}

// cleanupWALFiles removes WAL and SHM files for the given database path
// func cleanupWALFiles(dbPath string) error {
// 	// Get the directory and base name of the database file
// 	dir := filepath.Dir(dbPath)
// 	baseName := filepath.Base(dbPath)

// 	// Remove extension to get the base name without .db
// 	baseNameWithoutExt := strings.TrimSuffix(baseName, filepath.Ext(baseName))

// 	// WAL and SHM file patterns
// 	walFile := filepath.Join(dir, baseNameWithoutExt+".db-wal")
// 	shmFile := filepath.Join(dir, baseNameWithoutExt+".db-shm")

// 	// Try to remove WAL file
// 	if err := os.Remove(walFile); err != nil && !os.IsNotExist(err) {
// 		return fmt.Errorf("failed to remove WAL file %s: %w", walFile, err)
// 	} else if err == nil {
// 		log.Printf("Removed WAL file: %s", walFile)
// 	}

// 	// Try to remove SHM file
// 	if err := os.Remove(shmFile); err != nil && !os.IsNotExist(err) {
// 		return fmt.Errorf("failed to remove SHM file %s: %w", shmFile, err)
// 	} else if err == nil {
// 		log.Printf("Removed SHM file: %s", shmFile)
// 	}

// 		// Try to remove db file
// 	if err := os.Remove(dbPath); err != nil && !os.IsNotExist(err) {
// 		return fmt.Errorf("failed to remove DB file %s: %w", dbPath, err)
// 	} else if err == nil {
// 		log.Printf("Removed DB file: %s", dbPath)
// 	}

// 	return nil
// }

// CloseDatabase gracefully closes the database connection
func CloseDatabase(db *gorm.DB) error {
	sqlDB, err := db.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}