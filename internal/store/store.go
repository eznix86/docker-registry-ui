package store

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

type Store struct {
	db *sql.DB
	tx *sql.Tx
}

func New(ctx context.Context, dsn string) (*Store, error) {
	if err := os.MkdirAll(filepath.Dir(dsn), 0750); err != nil {
		return nil, fmt.Errorf("create data directory: %w", err)
	}

	db, err := sql.Open("sqlite3", dsn+"?_journal_mode=WAL&_foreign_keys=on")
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}

	db.SetMaxOpenConns(1)

	if err := migrate(ctx, db); err != nil {
		db.Close()
		return nil, fmt.Errorf("run migration: %w", err)
	}

	return &Store{db: db}, nil
}

func (s *Store) Close() {
	if s.db != nil {
		_ = s.db.Close()
	}
}

func (s *Store) WithinTx(ctx context.Context, fn func(tx *Store) error) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}

	txStore := &Store{tx: tx}
	if err := fn(txStore); err != nil {
		if rbErr := tx.Rollback(); rbErr != nil {
			return fmt.Errorf("rollback after %w: %w", err, rbErr)
		}
		return err
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit transaction: %w", err)
	}

	return nil
}

func (s *Store) exec(ctx context.Context, query string, args ...any) (sql.Result, error) {
	if s.tx != nil {
		return s.tx.ExecContext(ctx, query, args...)
	}
	return s.db.ExecContext(ctx, query, args...)
}

func (s *Store) query(ctx context.Context, query string, args ...any) (*sql.Rows, error) {
	if s.tx != nil {
		return s.tx.QueryContext(ctx, query, args...)
	}
	return s.db.QueryContext(ctx, query, args...)
}

func (s *Store) queryRow(ctx context.Context, query string, args ...any) *sql.Row {
	if s.tx != nil {
		return s.tx.QueryRowContext(ctx, query, args...)
	}
	return s.db.QueryRowContext(ctx, query, args...)
}

// Registry operations.

func (s *Store) GetAllRegistries(ctx context.Context) ([]Registry, error) {
	rows, err := s.query(ctx, "SELECT id, name, host, url, status, last_sync_at FROM registries ORDER BY name")
	if err != nil {
		return nil, fmt.Errorf("get all registries: %w", err)
	}
	defer rows.Close()

	registries := make([]Registry, 0)
	for rows.Next() {
		var r Registry
		if err := rows.Scan(&r.ID, &r.Name, &r.Host, &r.URL, &r.Status, &r.LastSyncAt); err != nil {
			return nil, fmt.Errorf("scan registry: %w", err)
		}
		registries = append(registries, r)
	}
	return registries, rows.Err()
}

func (s *Store) GetRegistryByHost(ctx context.Context, host string) (*Registry, error) {
	r := s.queryRow(ctx, "SELECT id, name, host, url, status, last_sync_at FROM registries WHERE host = ?", host)
	var reg Registry
	if err := r.Scan(&reg.ID, &reg.Name, &reg.Host, &reg.URL, &reg.Status, &reg.LastSyncAt); err != nil {
		return nil, fmt.Errorf("get registry by host %s: %w", host, err)
	}
	return &reg, nil
}

func (s *Store) UpsertRegistryByFields(ctx context.Context, name, url, host string, status int) (*Registry, error) {
	_, err := s.exec(ctx,
		`INSERT INTO registries (name, url, host, status) VALUES (?, ?, ?, ?)
		 ON CONFLICT(host) DO UPDATE SET name=excluded.name, url=excluded.url, status=excluded.status`,
		name, url, host, status)
	if err != nil {
		return nil, fmt.Errorf("upsert registry %s: %w", name, err)
	}
	r := s.queryRow(ctx, "SELECT id, name, host, url, status, last_sync_at FROM registries WHERE host = ?", host)
	var reg Registry
	if err := r.Scan(&reg.ID, &reg.Name, &reg.Host, &reg.URL, &reg.Status, &reg.LastSyncAt); err != nil {
		return nil, fmt.Errorf("get upserted registry %s: %w", name, err)
	}
	return &reg, nil
}

func (s *Store) UpdateRegistryStatus(ctx context.Context, host, status string) error {
	_, err := s.exec(ctx, "UPDATE registries SET status = ? WHERE host = ?", status, host)
	if err != nil {
		return fmt.Errorf("update registry status %s: %w", host, err)
	}
	return nil
}

func (s *Store) UpdateRegistryName(ctx context.Context, id uint, name string) error {
	_, err := s.exec(ctx, "UPDATE registries SET name = ? WHERE id = ?", name, id)
	if err != nil {
		return fmt.Errorf("update registry name %d: %w", id, err)
	}
	return nil
}

func (s *Store) DeleteRegistry(ctx context.Context, id uint) error {
	_, err := s.exec(ctx, "DELETE FROM registries WHERE id = ?", id)
	if err != nil {
		return fmt.Errorf("delete registry %d: %w", id, err)
	}
	return nil
}

// Repository operations.

func (s *Store) GetRepositoriesView(ctx context.Context) ([]RepositoryView, error) {
	return s.GetRepositoriesViewFiltered(ctx, RepositoryFilters{ShowUntagged: true})
}

func (s *Store) GetRepositoriesViewFiltered(ctx context.Context, filters RepositoryFilters) ([]RepositoryView, error) {
	var b strings.Builder
	b.WriteString("SELECT id, name, namespace, registry, registry_host, tags_count, architectures, total_size_bytes FROM repositories_view")

	var conditions []string
	var args []any

	if len(filters.Registries) > 0 {
		conditions = append(conditions, "registry_host IN ("+strings.Repeat("?,", len(filters.Registries)-1)+"?)")
		for _, r := range filters.Registries {
			args = append(args, r)
		}
	}
	for _, arch := range filters.Architectures {
		conditions = append(conditions, "architectures LIKE ?")
		args = append(args, "%\""+arch+"\"%")
	}
	if filters.Search != "" {
		conditions = append(conditions, "(name LIKE ? OR namespace LIKE ?)")
		s := "%" + filters.Search + "%"
		args = append(args, s, s)
	}
	if !filters.ShowUntagged {
		conditions = append(conditions, "tags_count > 0")
	}

	if len(conditions) > 0 {
		b.WriteString(" WHERE ")
		b.WriteString(strings.Join(conditions, " AND "))
	}

	rows, err := s.query(ctx, b.String(), args...)
	if err != nil {
		return nil, fmt.Errorf("query repositories view: %w", err)
	}
	defer rows.Close()

	var repos []RepositoryView
	for rows.Next() {
		var rv RepositoryView
		var archJSON string
		if err := rows.Scan(&rv.ID, &rv.Name, &rv.Namespace, &rv.Registry, &rv.RegistryHost, &rv.TagsCount, &archJSON, &rv.TotalSizeInBytes); err != nil {
			return nil, fmt.Errorf("scan repository view: %w", err)
		}
		rv.Architectures = parseArchitectures(archJSON)
		repos = append(repos, rv)
	}
	return repos, rows.Err()
}

func (s *Store) GetRepositoryByPath(ctx context.Context, registryHost, namespace, name string) (*RepositoryView, error) {
	rows, err := s.query(ctx,
		`SELECT id, name, namespace, registry, registry_host, tags_count, architectures, total_size_bytes
		 FROM repositories_view WHERE registry_host = ? AND namespace = ? AND name = ?`,
		registryHost, namespace, name)
	if err != nil {
		return nil, fmt.Errorf("get repository by path: %w", err)
	}
	defer rows.Close()

	if !rows.Next() {
		return nil, fmt.Errorf("repository not found: %s/%s/%s", registryHost, namespace, name)
	}
	var rv RepositoryView
	var archJSON string
	if err := rows.Scan(&rv.ID, &rv.Name, &rv.Namespace, &rv.Registry, &rv.RegistryHost, &rv.TagsCount, &archJSON, &rv.TotalSizeInBytes); err != nil {
		return nil, fmt.Errorf("scan repository view: %w", err)
	}
	rv.Architectures = parseArchitectures(archJSON)
	return &rv, rows.Err()
}

func (s *Store) UpsertRepositoryByFields(ctx context.Context, registryID uint, namespace, name string) (*Repository, error) {
	now := time.Now()
	_, err := s.exec(ctx,
		`INSERT INTO repositories (registry_id, namespace, name, last_sync_at)
		 VALUES (?, ?, ?, ?)
		 ON CONFLICT(registry_id, namespace, name) DO UPDATE SET last_sync_at=excluded.last_sync_at`,
		registryID, namespace, name, now)
	if err != nil {
		return nil, fmt.Errorf("upsert repository %s/%s: %w", namespace, name, err)
	}
	r := s.queryRow(ctx,
		"SELECT id, registry_id, namespace, name, last_sync_at FROM repositories WHERE registry_id = ? AND namespace = ? AND name = ?",
		registryID, namespace, name)
	var repo Repository
	if err := r.Scan(&repo.ID, &repo.RegistryID, &repo.Namespace, &repo.Name, &repo.LastSyncAt); err != nil {
		return nil, fmt.Errorf("scan upserted repository %s/%s: %w", namespace, name, err)
	}
	return &repo, nil
}

func (s *Store) UpdateRepositorySyncTime(ctx context.Context, repositoryID uint) error {
	_, err := s.exec(ctx, "UPDATE repositories SET last_sync_at = ? WHERE id = ?", time.Now(), repositoryID)
	if err != nil {
		return fmt.Errorf("update repository sync time %d: %w", repositoryID, err)
	}
	return nil
}

func (s *Store) DeleteRepository(ctx context.Context, repo *Repository) error {
	_, err := s.exec(ctx, "DELETE FROM repositories WHERE id = ?", repo.ID)
	if err != nil {
		return fmt.Errorf("delete repository %d: %w", repo.ID, err)
	}
	return nil
}

func (s *Store) DeleteStaleRepos(ctx context.Context, registryID uint, keepIDs []uint) error {
	if len(keepIDs) == 0 {
		_, err := s.exec(ctx, "DELETE FROM repositories WHERE registry_id = ?", registryID)
		return err
	}
	phs := make([]string, len(keepIDs))
	args := []any{registryID}
	for i, id := range keepIDs {
		phs[i] = "?"
		args = append(args, id)
	}
	_, err := s.exec(ctx,
		fmt.Sprintf("DELETE FROM repositories WHERE registry_id = ? AND id NOT IN (%s)",
			strings.Join(phs, ",")),
		args...)
	if err != nil {
		return fmt.Errorf("delete stale repos: %w", err)
	}
	return nil
}

// Tag operations.

func (s *Store) GetAllTags(ctx context.Context) ([]Tag, error) {
	rows, err := s.query(ctx,
		`SELECT id, repo_id, name, digest, kind, media_type,
		 last_sync_at, next_check_at, priority, sync_status, last_error FROM tags`)
	if err != nil {
		return nil, fmt.Errorf("get all tags: %w", err)
	}
	defer rows.Close()
	return scanTags(rows)
}

func (s *Store) GetTagByRepoAndName(ctx context.Context, repositoryID uint, name string) (*Tag, error) {
	r := s.queryRow(ctx,
		`SELECT id, repo_id, name, digest, kind, media_type,
		 last_sync_at, next_check_at, priority, sync_status, last_error
		 FROM tags WHERE repo_id = ? AND name = ?`, repositoryID, name)
	return scanTag(r)
}

func (s *Store) GetTagsByRepoAndDigest(ctx context.Context, repositoryID uint, digest string) ([]Tag, error) {
	rows, err := s.query(ctx,
		`SELECT id, repo_id, name, digest, kind, media_type,
		 last_sync_at, next_check_at, priority, sync_status, last_error
		 FROM tags WHERE repo_id = ? AND digest = ?`, repositoryID, digest)
	if err != nil {
		return nil, fmt.Errorf("get tags by digest: %w", err)
	}
	defer rows.Close()
	return scanTags(rows)
}

func (s *Store) GetTagsByRepoAndDigests(ctx context.Context, repositoryID uint, digests []string) ([]Tag, error) {
	if len(digests) == 0 {
		return nil, nil
	}
	phs := make([]string, len(digests))
	args := []any{repositoryID}
	for i, d := range digests {
		phs[i] = "?"
		args = append(args, d)
	}
	rows, err := s.query(ctx,
		fmt.Sprintf(`SELECT id, repo_id, name, digest, kind, media_type,
		 last_sync_at, next_check_at, priority, sync_status, last_error
		 FROM tags WHERE repo_id = ? AND digest IN (%s) ORDER BY name ASC`,
			strings.Join(phs, ",")),
		args...)
	if err != nil {
		return nil, fmt.Errorf("get tags by digests: %w", err)
	}
	defer rows.Close()
	return scanTags(rows)
}

func (s *Store) UpsertTag(ctx context.Context, tag *Tag) error {
	_, err := s.exec(ctx,
		`INSERT INTO tags (repo_id, name, digest, kind, media_type,
		 last_sync_at, next_check_at, priority, sync_status, last_error)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		 ON CONFLICT(repo_id, name) DO UPDATE SET
			digest=excluded.digest, kind=excluded.kind, media_type=excluded.media_type,
			last_sync_at=excluded.last_sync_at, sync_status=excluded.sync_status`,
		tag.RepositoryID, tag.Name, tag.Digest, tag.Kind, tag.MediaType,
		tag.LastSyncAt, tag.NextCheckAt, tag.Priority, tag.SyncStatus, tag.LastError)
	if err != nil {
		return fmt.Errorf("upsert tag %d/%s: %w", tag.RepositoryID, tag.Name, err)
	}
	return nil
}

func (s *Store) DeleteTag(ctx context.Context, tag *Tag) error {
	_, err := s.exec(ctx, "DELETE FROM tags WHERE id = ?", tag.ID)
	if err != nil {
		return fmt.Errorf("delete tag %d/%s: %w", tag.RepositoryID, tag.Name, err)
	}
	return nil
}

func (s *Store) DeleteStaleTags(ctx context.Context, repoID uint, keepNames []string) error {
	if len(keepNames) == 0 {
		_, err := s.exec(ctx, "DELETE FROM tags WHERE repo_id = ?", repoID)
		return err
	}
	phs := make([]string, len(keepNames))
	args := []any{repoID}
	for i, n := range keepNames {
		phs[i] = "?"
		args = append(args, n)
	}
	_, err := s.exec(ctx,
		fmt.Sprintf("DELETE FROM tags WHERE repo_id = ? AND name NOT IN (%s)",
			strings.Join(phs, ",")),
		args...)
	if err != nil {
		return fmt.Errorf("delete stale tags: %w", err)
	}
	return nil
}

func (s *Store) UpsertTagWithSync(ctx context.Context, repoID uint, tagName, digest, kind, mediaType string, priorityScore float64) (*Tag, error) {
	now := time.Now()
	nextCheck := now.Add(30 * time.Second)
	_, err := s.exec(ctx,
		`INSERT INTO tags (repo_id, name, digest, kind, media_type, last_sync_at, next_check_at, priority, sync_status, last_error)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ok', '')
		 ON CONFLICT(repo_id, name) DO UPDATE SET
			digest=excluded.digest, kind=excluded.kind, media_type=excluded.media_type,
			priority=excluded.priority, last_sync_at=excluded.last_sync_at,
			next_check_at=excluded.next_check_at, sync_status=excluded.sync_status,
			last_error=excluded.last_error`,
		repoID, tagName, digest, kind, mediaType, now, nextCheck, priorityScore)
	if err != nil {
		return nil, fmt.Errorf("upsert tag with sync %d/%s: %w", repoID, tagName, err)
	}
	return s.GetTagByRepoAndName(ctx, repoID, tagName)
}

func (s *Store) MarkTagSyncError(ctx context.Context, repoID uint, tagName, errorMsg string) error {
	now := time.Now()
	nextCheck := now.Add(5 * time.Minute)
	_, err := s.exec(ctx,
		`INSERT INTO tags (repo_id, name, digest, kind, media_type, last_sync_at, next_check_at, priority, sync_status, last_error)
		 VALUES (?, ?, '', '', '', ?, ?, 1.0, 'error', ?)
		 ON CONFLICT(repo_id, name) DO UPDATE SET
			last_sync_at=excluded.last_sync_at, next_check_at=excluded.next_check_at,
			sync_status='error', last_error=excluded.last_error`,
		repoID, tagName, now, nextCheck, errorMsg)
	if err != nil {
		return fmt.Errorf("mark tag sync error %d/%s: %w", repoID, tagName, err)
	}
	return nil
}

func (s *Store) UpdateTagSyncMetadata(ctx context.Context, repoID uint, tagName string, priorityScore float64, recheckDuration time.Duration) error {
	now := time.Now()
	nextCheck := now.Add(recheckDuration)
	_, err := s.exec(ctx,
		`UPDATE tags SET priority = ?, last_sync_at = ?, next_check_at = ?,
		 sync_status = 'ok', last_error = '' WHERE repo_id = ? AND name = ?`,
		priorityScore, now, nextCheck, repoID, tagName)
	if err != nil {
		return fmt.Errorf("update tag sync metadata %d/%s: %w", repoID, tagName, err)
	}
	return nil
}

// Manifest operations.

func (s *Store) UpsertManifestByFields(ctx context.Context, digest, mediaType, kind, rawJSON, configDigest, os, arch, variant string, sizeBytes int64, created *time.Time) (*Manifest, error) {
	now := time.Now()
	_, err := s.exec(ctx,
		`INSERT INTO manifests (digest, media_type, kind, raw_json, config_digest, os, architecture, variant, size_bytes, created, seen_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		 ON CONFLICT(digest) DO UPDATE SET
			media_type=excluded.media_type, kind=excluded.kind, raw_json=excluded.raw_json,
			config_digest=excluded.config_digest, os=excluded.os, architecture=excluded.architecture,
			variant=excluded.variant, size_bytes=excluded.size_bytes, created=excluded.created, seen_at=excluded.seen_at`,
		digest, mediaType, kind, rawJSON, configDigest, os, arch, variant, sizeBytes, created, now)
	if err != nil {
		return nil, fmt.Errorf("upsert manifest %s: %w", digest, err)
	}
	r := s.queryRow(ctx,
		`SELECT digest, media_type, kind, raw_json, config_digest, os, architecture, variant, size_bytes, created, seen_at
		 FROM manifests WHERE digest = ?`, digest)
	var m Manifest
	if err := r.Scan(&m.Digest, &m.MediaType, &m.Kind, &m.RawJSON, &m.ConfigDigest, &m.OS, &m.Architecture, &m.Variant, &m.SizeBytes, &m.Created, &m.SeenAt); err != nil {
		return nil, fmt.Errorf("scan upserted manifest %s: %w", digest, err)
	}
	return &m, nil
}

func (s *Store) UpsertConfigBlobByFields(ctx context.Context, digest string, sizeBytes int64, configJSON, os, arch string, created *time.Time) (*ConfigBlob, error) {
	now := time.Now()
	_, err := s.exec(ctx,
		`INSERT INTO config_blobs (digest, size_bytes, created, config_json, os, architecture, seen_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?)
		 ON CONFLICT(digest) DO UPDATE SET
			size_bytes=excluded.size_bytes, created=excluded.created, config_json=excluded.config_json,
			os=excluded.os, architecture=excluded.architecture, seen_at=excluded.seen_at`,
		digest, sizeBytes, created, configJSON, os, arch, now)
	if err != nil {
		return nil, fmt.Errorf("upsert config blob %s: %w", digest, err)
	}
	r := s.queryRow(ctx,
		"SELECT digest, size_bytes, created, config_json, os, architecture, seen_at FROM config_blobs WHERE digest = ?", digest)
	var cb ConfigBlob
	if err := r.Scan(&cb.Digest, &cb.SizeBytes, &cb.Created, &cb.ConfigJSON, &cb.OS, &cb.Architecture, &cb.SeenAt); err != nil {
		return nil, fmt.Errorf("scan upserted config blob %s: %w", digest, err)
	}
	return &cb, nil
}

func (s *Store) UpsertLayerByFields(ctx context.Context, digest string, sizeBytes int64, mediaType string) (*Layer, error) {
	_, err := s.exec(ctx,
		`INSERT INTO layers (digest, size_bytes, media_type) VALUES (?, ?, ?)
		 ON CONFLICT(digest) DO UPDATE SET size_bytes=excluded.size_bytes, media_type=excluded.media_type`,
		digest, sizeBytes, mediaType)
	if err != nil {
		return nil, fmt.Errorf("upsert layer %s: %w", digest, err)
	}
	r := s.queryRow(ctx, "SELECT digest, size_bytes, media_type FROM layers WHERE digest = ?", digest)
	var l Layer
	if err := r.Scan(&l.Digest, &l.SizeBytes, &l.MediaType); err != nil {
		return nil, fmt.Errorf("scan upserted layer %s: %w", digest, err)
	}
	return &l, nil
}

func (s *Store) LinkManifestLayers(ctx context.Context, manifestDigest string, layerDigests []string) error {
	if _, err := s.exec(ctx, "DELETE FROM manifest_layers WHERE manifest_digest = ?", manifestDigest); err != nil {
		return fmt.Errorf("delete manifest layers for %s: %w", manifestDigest, err)
	}
	for pos, layerDigest := range layerDigests {
		if _, err := s.exec(ctx,
			"INSERT INTO manifest_layers (manifest_digest, layer_digest, position) VALUES (?, ?, ?)",
			manifestDigest, layerDigest, pos); err != nil {
			return fmt.Errorf("insert manifest layer %s/%s: %w", manifestDigest, layerDigest, err)
		}
	}
	return nil
}

func (s *Store) LinkManifestPlatform(ctx context.Context, indexDigest, platformDigest, os, arch, variant string, position int, sizeBytes int64) error {
	_, err := s.exec(ctx,
		`INSERT OR REPLACE INTO manifest_platforms (index_digest, platform_digest, os, architecture, variant, position, size_bytes)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		indexDigest, platformDigest, os, arch, variant, position, sizeBytes)
	if err != nil {
		return fmt.Errorf("link manifest platform %s -> %s: %w", indexDigest, platformDigest, err)
	}
	return nil
}

func (s *Store) CleanupOrphans(ctx context.Context) error {
	if _, err := s.exec(ctx,
		"DELETE FROM layers WHERE digest NOT IN (SELECT DISTINCT layer_digest FROM manifest_layers)"); err != nil {
		return fmt.Errorf("cleanup orphan layers: %w", err)
	}
	if _, err := s.exec(ctx,
		"DELETE FROM config_blobs WHERE digest NOT IN (SELECT DISTINCT config_digest FROM manifests WHERE config_digest IS NOT NULL)"); err != nil {
		return fmt.Errorf("cleanup orphan config blobs: %w", err)
	}
	return nil
}

// Helpers.

func scanTags(rows *sql.Rows) ([]Tag, error) {
	var tags []Tag
	for rows.Next() {
		var t Tag
		if err := rows.Scan(&t.ID, &t.RepositoryID, &t.Name, &t.Digest, &t.Kind, &t.MediaType,
			&t.LastSyncAt, &t.NextCheckAt, &t.Priority, &t.SyncStatus, &t.LastError); err != nil {
			return nil, fmt.Errorf("scan tag: %w", err)
		}
		tags = append(tags, t)
	}
	return tags, rows.Err()
}

func scanTag(r *sql.Row) (*Tag, error) {
	var t Tag
	if err := r.Scan(&t.ID, &t.RepositoryID, &t.Name, &t.Digest, &t.Kind, &t.MediaType,
		&t.LastSyncAt, &t.NextCheckAt, &t.Priority, &t.SyncStatus, &t.LastError); err != nil {
		return nil, fmt.Errorf("scan tag: %w", err)
	}
	return &t, nil
}

func pickString(nullable sql.NullString) string {
	if nullable.Valid {
		return nullable.String
	}
	return ""
}

func parseArchitectures(json string) []string {
	if json == "" || json == "[]" {
		return nil
	}
	trimmed := strings.Trim(json, "[]")
	if trimmed == "" {
		return nil
	}
	parts := strings.Split(trimmed, ",")
	var result []string
	for _, p := range parts {
		p = strings.TrimSpace(p)
		p = strings.Trim(p, "\"")
		if p != "" {
			result = append(result, p)
		}
	}
	return result
}

func splitPath(path string) (namespace, name string) {
	parts := strings.SplitN(path, "/", 2)
	if len(parts) == 2 {
		return parts[0], parts[1]
	}
	return "", parts[0]
}
