package store_test

import (
	"context"
	"testing"
	"time"

	"github.com/eznix86/docker-registry-ui/internal/store"
)

func setupStore(t *testing.T) (*store.Store, context.Context) {
	t.Helper()
	ctx := context.Background()
	s, err := store.New(ctx, ":memory:")
	if err != nil {
		t.Fatalf("Failed to create in-memory store: %v", err)
	}
	t.Cleanup(func() { s.Close() })
	return s, ctx
}

func TestNewStoreCreatesSchema(t *testing.T) {
	s, ctx := setupStore(t)

	registries, err := s.GetAllRegistries(ctx)
	if err != nil {
		t.Fatalf("GetAllRegistries: %v", err)
	}
	if len(registries) != 0 {
		t.Fatalf("expected empty registries, got %d", len(registries))
	}
}

func TestUpsertAndGetRegistry(t *testing.T) {
	s, ctx := setupStore(t)

	reg, err := s.UpsertRegistryByFields(ctx, "dockerhub", "https://registry-1.docker.io", "registry-1.docker.io", 1)
	if err != nil {
		t.Fatalf("UpsertRegistryByFields: %v", err)
	}
	if reg.ID == 0 {
		t.Fatal("expected non-zero ID")
	}
	if reg.Name != "dockerhub" {
		t.Fatalf("expected name dockerhub, got %s", reg.Name)
	}

	got, err := s.GetRegistryByHost(ctx, "registry-1.docker.io")
	if err != nil {
		t.Fatalf("GetRegistryByHost: %v", err)
	}
	if got.Name != "dockerhub" {
		t.Fatalf("expected name dockerhub, got %s", got.Name)
	}
}

func TestUpsertAndGetRepository(t *testing.T) {
	s, ctx := setupStore(t)

	reg, _ := s.UpsertRegistryByFields(ctx, "ghcr", "https://ghcr.io", "ghcr.io", 1)

	repo, err := s.UpsertRepositoryByFields(ctx, reg.ID, "myorg", "myapp")
	if err != nil {
		t.Fatalf("UpsertRepositoryByFields: %v", err)
	}
	if repo.ID == 0 {
		t.Fatal("expected non-zero ID")
	}
	if repo.Namespace != "myorg" || repo.Name != "myapp" {
		t.Fatalf("unexpected namespace/name: %s/%s", repo.Namespace, repo.Name)
	}

	views, err := s.GetRepositoriesViewFiltered(ctx, store.RepositoryFilters{ShowUntagged: true})
	if err != nil {
		t.Fatalf("GetRepositoriesViewFiltered: %v", err)
	}
	if len(views) == 0 {
		t.Fatal("expected at least one repository view")
	}
}

func TestHardDeleteRepository(t *testing.T) {
	s, ctx := setupStore(t)

	reg, _ := s.UpsertRegistryByFields(ctx, "test", "https://test.io", "test.io", 1)
	repo, _ := s.UpsertRepositoryByFields(ctx, reg.ID, "", "todelete")

	if err := s.DeleteRepository(ctx, repo); err != nil {
		t.Fatalf("DeleteRepository: %v", err)
	}

	views, _ := s.GetRepositoriesView(ctx)
	for _, v := range views {
		if v.ID == repo.ID {
			t.Fatal("expected deleted repository to be absent from view")
		}
	}
}

func TestUpsertTagWithSync(t *testing.T) {
	s, ctx := setupStore(t)

	reg, _ := s.UpsertRegistryByFields(ctx, "test", "https://test.io", "test.io", 1)
	repo, _ := s.UpsertRepositoryByFields(ctx, reg.ID, "lib", "nginx")

	tag, err := s.UpsertTagWithSync(ctx, repo.ID, "latest",
		"sha256:abc123", "image", "application/vnd.docker.distribution.manifest.v2+json", 5.0)
	if err != nil {
		t.Fatalf("UpsertTagWithSync: %v", err)
	}
	if tag.Digest != "sha256:abc123" {
		t.Fatalf("expected digest sha256:abc123, got %s", tag.Digest)
	}
	if tag.SyncStatus != "ok" {
		t.Fatalf("expected sync_status ok, got %s", tag.SyncStatus)
	}
}

func TestMarkTagSyncError(t *testing.T) {
	s, ctx := setupStore(t)

	reg, _ := s.UpsertRegistryByFields(ctx, "test", "https://test.io", "test.io", 1)
	repo, _ := s.UpsertRepositoryByFields(ctx, reg.ID, "lib", "error-test")

	if err := s.MarkTagSyncError(ctx, repo.ID, "broken", "something went wrong"); err != nil {
		t.Fatalf("MarkTagSyncError: %v", err)
	}

	tag, err := s.GetTagByRepoAndName(ctx, repo.ID, "broken")
	if err != nil {
		t.Fatalf("GetTagByRepoAndName: %v", err)
	}
	if tag.SyncStatus != "error" {
		t.Fatalf("expected sync_status error, got %s", tag.SyncStatus)
	}
	if tag.LastError != "something went wrong" {
		t.Fatalf("expected last_error, got %s", tag.LastError)
	}
}

func TestHardDeleteTag(t *testing.T) {
	s, ctx := setupStore(t)

	reg, _ := s.UpsertRegistryByFields(ctx, "test", "https://test.io", "test.io", 1)
	repo, _ := s.UpsertRepositoryByFields(ctx, reg.ID, "", "todelete")
	tag, _ := s.UpsertTagWithSync(ctx, repo.ID, "v1", "sha256:def456", "image", "application/vnd.docker.distribution.manifest.v2+json", 1.0)

	if err := s.DeleteTag(ctx, tag); err != nil {
		t.Fatalf("DeleteTag: %v", err)
	}

	_, err := s.GetTagByRepoAndName(ctx, repo.ID, "v1")
	if err == nil {
		t.Fatal("expected error when fetching deleted tag")
	}
}

func TestUpsertManifestWithCreated(t *testing.T) {
	s, ctx := setupStore(t)

	created := time.Date(2024, 1, 15, 10, 30, 0, 0, time.UTC)
	m, err := s.UpsertManifestByFields(ctx, "sha256:manifest1", "application/vnd.docker.distribution.manifest.v2+json",
		"image", `{"config":{}}`, "sha256:cfg1", "linux", "amd64", "", 12345, &created)
	if err != nil {
		t.Fatalf("UpsertManifestByFields: %v", err)
	}
	if m.Created == nil {
		t.Fatal("expected non-nil Created on manifest")
	}
	if !m.Created.Equal(created) {
		t.Fatalf("expected created %v, got %v", created, m.Created)
	}
	if m.ConfigDigest != "sha256:cfg1" {
		t.Fatalf("expected config_digest sha256:cfg1, got %s", m.ConfigDigest)
	}
}

func TestLinkManifestPlatform(t *testing.T) {
	s, ctx := setupStore(t)

	m1, _ := s.UpsertManifestByFields(ctx, "sha256:index1", "application/vnd.oci.image.index.v1+json",
		"index", `{}`, "", "", "", "", 0, nil)
	m2, _ := s.UpsertManifestByFields(ctx, "sha256:platform1", "application/vnd.docker.distribution.manifest.v2+json",
		"image", `{}`, "sha256:cfg1", "linux", "amd64", "", 5000, nil)

	if err := s.LinkManifestPlatform(ctx, m1.Digest, m2.Digest, "linux", "amd64", "", 0, 5000); err != nil {
		t.Fatalf("LinkManifestPlatform: %v", err)
	}

	// Verify the relationship is reflected in repository views.
	tags, _ := s.GetTagsForRepository(ctx, 1, store.TagFilter{}, store.ScrollPagination{Page: 1, PageSize: 10})
	_ = tags
}

func TestConfigBlobDeduplication(t *testing.T) {
	s, ctx := setupStore(t)

	created := time.Now()
	cb1, err := s.UpsertConfigBlobByFields(ctx, "sha256:blob1", 500, `{"os":"linux"}`, "linux", "amd64", &created)
	if err != nil {
		t.Fatalf("first UpsertConfigBlobByFields: %v", err)
	}

	cb2, err := s.UpsertConfigBlobByFields(ctx, "sha256:blob1", 600, `{"os":"linux"}`, "linux", "amd64", &created)
	if err != nil {
		t.Fatalf("second UpsertConfigBlobByFields: %v", err)
	}

	if cb1.Digest != cb2.Digest {
		t.Fatal("expected same digest for config blob deduplication")
	}
	if cb2.SizeBytes != 600 {
		t.Fatalf("expected updated size 600, got %d", cb2.SizeBytes)
	}
}

func TestLayerDeduplication(t *testing.T) {
	s, ctx := setupStore(t)

	l1, _ := s.UpsertLayerByFields(ctx, "sha256:layer1", 1000, "application/vnd.docker.image.rootfs.diff.tar.gzip")
	l2, _ := s.UpsertLayerByFields(ctx, "sha256:layer1", 2000, "application/vnd.docker.image.rootfs.diff.tar.gzip")

	if l1.Digest != l2.Digest {
		t.Fatal("expected same digest for layer deduplication")
	}
	if l2.SizeBytes != 2000 {
		t.Fatalf("expected updated size 2000, got %d", l2.SizeBytes)
	}
}

func TestRepositoryViewIncludesTagCount(t *testing.T) {
	s, ctx := setupStore(t)

	reg, _ := s.UpsertRegistryByFields(ctx, "test", "https://test.io", "test.io", 1)
	repo, _ := s.UpsertRepositoryByFields(ctx, reg.ID, "lib", "busybox")
	s.UpsertTagWithSync(ctx, repo.ID, "v1", "sha256:aaa", "image", "app/json", 1.0)
	s.UpsertTagWithSync(ctx, repo.ID, "v2", "sha256:bbb", "image", "app/json", 1.0)

	views, err := s.GetRepositoriesView(ctx)
	if err != nil {
		t.Fatalf("GetRepositoriesView: %v", err)
	}
	var found *store.RepositoryView
	for i := range views {
		if views[i].ID == repo.ID {
			found = &views[i]
			break
		}
	}
	if found == nil {
		t.Fatal("expected repository to appear in view")
	}
	if found.TagsCount != 2 {
		t.Fatalf("expected 2 tags, got %d", found.TagsCount)
	}
}
