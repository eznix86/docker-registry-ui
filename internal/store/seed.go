package store

import (
	"context"
	"time"
)

const (
	seedRegistryDockerHub = "dockerhub"
	seedNamespaceLibrary  = "library"
)

// Seed inserts test data for development.
func (s *Store) Seed(ctx context.Context) error {
	return s.WithinTx(ctx, seedData)
}

func seedData(s *Store) error {
	ctx := context.Background()
	if _, err := s.exec(ctx,
		"INSERT OR IGNORE INTO registries (name, host, url, status) VALUES ('dockerhub', 'registry-1.docker.io', 'https://registry-1.docker.io', 1)"); err != nil {
		return err
	}
	if _, err := s.exec(ctx,
		"INSERT OR IGNORE INTO registries (name, host, url, status) VALUES ('ghcr', 'ghcr.io', 'https://ghcr.io', 1)"); err != nil {
		return err
	}

	repos := []struct{ reg, ns, name string }{
		{seedRegistryDockerHub, seedNamespaceLibrary, "nginx"},
		{seedRegistryDockerHub, seedNamespaceLibrary, "redis"},
		{seedRegistryDockerHub, seedNamespaceLibrary, "alpine"},
		{seedRegistryDockerHub, "", "myapp"},
		{"ghcr", "", "backend"},
	}
	now := time.Now()

	for _, repo := range repos {
		var regID uint
		if err := s.queryRow(ctx, "SELECT id FROM registries WHERE name = ?", repo.reg).Scan(&regID); err != nil {
			return err
		}
		if _, err := s.exec(ctx,
			`INSERT OR IGNORE INTO repositories (registry_id, namespace, name, last_sync_at)
			 VALUES (?, ?, ?, ?)`, regID, repo.ns, repo.name, now); err != nil {
			return err
		}
	}

	return nil
}
