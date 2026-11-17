package store_test

import (
	"context"
	"testing"

	"github.com/eznix86/docker-registry-ui/internal/store"
)

const ociManifest = "application/vnd.oci.image.manifest.v1+json"

func pushChartVersion(t *testing.T, s *store.Store, ctx context.Context, repoID uint, version string) {
	t.Helper()
	config := "sha256:config-" + version
	manifest := "sha256:manifest-" + version
	if _, err := s.UpsertConfigBlobByFields(ctx, config, 80, `{"name":"app","version":"`+version+`","apiVersion":"v2"}`, "", "", nil); err != nil {
		t.Fatalf("UpsertConfigBlobByFields: %v", err)
	}
	mustManifest(t, s, ctx, manifest, ociManifest, "helm", config, "", "", 1000)
	if _, err := s.UpsertTagWithSync(ctx, repoID, version, manifest, "helm", ociManifest, 1.0); err != nil {
		t.Fatalf("UpsertTagWithSync: %v", err)
	}
}

func TestChartVersionsListEveryVersionHighestSemverFirst(t *testing.T) {
	s, ctx := setupStore(t)
	reg := mustRegistry(t, s, ctx, "main", "https://main.io", "main.io")
	repo := mustRepository(t, s, ctx, reg.ID, "charts", "app")

	for _, v := range []string{"1.2.0", "1.10.0", "1.9.0"} {
		pushChartVersion(t, s, ctx, repo.ID, v)
	}

	versions, err := s.GetChartVersions(ctx, repo.ID)
	if err != nil {
		t.Fatalf("GetChartVersions: %v", err)
	}
	got := make([]string, 0, len(versions))
	for _, v := range versions {
		got = append(got, v.Name)
	}
	want := []string{"1.10.0", "1.9.0", "1.2.0"}
	if len(got) != len(want) {
		t.Fatalf("expected %v, got %v", want, got)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("expected %v, got %v", want, got)
		}
	}
}

func TestRepositoryHoldingAnImageTagHasNoChartVersions(t *testing.T) {
	s, ctx := setupStore(t)
	reg := mustRegistry(t, s, ctx, "main", "https://main.io", "main.io")
	repo := mustRepository(t, s, ctx, reg.ID, "charts", "mixed")

	pushChartVersion(t, s, ctx, repo.ID, "1.0.0")
	mustManifest(t, s, ctx, "sha256:image", ociManifest, "image", "", "linux", "amd64", 2000)
	if _, err := s.UpsertTagWithSync(ctx, repo.ID, "latest", "sha256:image", "image", ociManifest, 1.0); err != nil {
		t.Fatalf("UpsertTagWithSync: %v", err)
	}

	versions, err := s.GetChartVersions(ctx, repo.ID)
	if err != nil {
		t.Fatalf("GetChartVersions: %v", err)
	}
	if versions != nil {
		t.Fatalf("expected no chart versions, got %d", len(versions))
	}
}
