package store

import (
	"context"
	"database/sql"
	"embed"
	"fmt"
	"path"
	"sort"
	"strconv"
	"strings"
)

//go:embed migrations/*.sql
var migrationFiles embed.FS

type migration struct {
	version int
	name    string
	up      string
}

func migrate(ctx context.Context, db *sql.DB) error {
	if _, err := db.ExecContext(ctx, `CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)`); err != nil {
		return fmt.Errorf("create schema_version table: %w", err)
	}

	migrations, err := loadMigrations()
	if err != nil {
		return err
	}

	sort.Slice(migrations, func(i, j int) bool {
		return migrations[i].version < migrations[j].version
	})

	if err := validateMigrations(migrations); err != nil {
		return err
	}

	var currentVersion int
	row := db.QueryRowContext(ctx, "SELECT COALESCE(MAX(version), 0) FROM schema_version")
	if err := row.Scan(&currentVersion); err != nil {
		return fmt.Errorf("read schema version: %w", err)
	}

	for _, m := range migrations {
		if m.version <= currentVersion {
			continue
		}
		if _, err := db.ExecContext(ctx, m.up); err != nil {
			return fmt.Errorf("migration %d %s: %w", m.version, m.name, err)
		}
		if _, err := db.ExecContext(ctx, "INSERT INTO schema_version (version) VALUES (?)", m.version); err != nil {
			return fmt.Errorf("record migration %d %s: %w", m.version, m.name, err)
		}
	}

	return nil
}

func validateMigrations(migrations []migration) error {
	seen := make(map[int]bool, len(migrations))
	for _, m := range migrations {
		if seen[m.version] {
			return fmt.Errorf("duplicate migration version %d", m.version)
		}
		seen[m.version] = true
	}

	return nil
}

func loadMigrations() ([]migration, error) {
	entries, err := migrationFiles.ReadDir("migrations")
	if err != nil {
		return nil, fmt.Errorf("read embedded migrations: %w", err)
	}

	migrations := make([]migration, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() || path.Ext(entry.Name()) != ".sql" {
			continue
		}

		migration, err := parseMigrationFile(entry.Name())
		if err != nil {
			return nil, err
		}
		migrations = append(migrations, migration)
	}

	return migrations, nil
}

func parseMigrationFile(fileName string) (migration, error) {
	content, err := migrationFiles.ReadFile(path.Join("migrations", fileName))
	if err != nil {
		return migration{}, fmt.Errorf("read migration %s: %w", fileName, err)
	}

	baseName := strings.TrimSuffix(fileName, ".sql")
	parts := strings.SplitN(baseName, "_", 2)
	if len(parts) != 2 {
		return migration{}, fmt.Errorf("invalid migration filename %s", fileName)
	}

	version, err := strconv.Atoi(parts[0])
	if err != nil {
		return migration{}, fmt.Errorf("parse migration version %s: %w", fileName, err)
	}

	return migration{
		version: version,
		name:    parts[1],
		up:      string(content),
	}, nil
}
