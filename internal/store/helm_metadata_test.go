package store_test

import (
	"testing"

	"github.com/eznix86/docker-registry-ui/internal/store"
)

func TestHelmTagExposesChartMetadataFromItsConfigBlob(t *testing.T) {
	s, ctx := setupStore(t)

	reg := mustRegistry(t, s, ctx, "main", "https://main.io", "main.io")
	repo := mustRepository(t, s, ctx, reg.ID, "charts", "podinfo")

	configJSON := `{
		"name": "podinfo",
		"version": "6.7.0",
		"appVersion": "6.7.0-app",
		"kubeVersion": ">=1.23.0-0",
		"deprecated": true,
		"apiVersion": "v2",
		"type": "application",
		"dependencies": [
			{"name": "redis", "version": "18.x.x", "repository": "oci://registry-1.docker.io/bitnamicharts", "condition": "redis.enabled"},
			{"name": "common", "version": "2.0.0", "repository": "https://charts.example.com"}
		]
	}`
	if _, err := s.UpsertConfigBlobByFields(ctx, "sha256:helm-config", 300, configJSON, "", "", nil); err != nil {
		t.Fatalf("UpsertConfigBlobByFields: %v", err)
	}
	mustManifest(t, s, ctx, "sha256:helm-manifest", "application/vnd.oci.image.manifest.v1+json", "helm", "sha256:helm-config", "", "", 5000)
	if _, err := s.UpsertTagWithSync(ctx, repo.ID, "6.7.0", "sha256:helm-manifest", "helm", "application/vnd.oci.image.manifest.v1+json", 1.0); err != nil {
		t.Fatalf("UpsertTagWithSync: %v", err)
	}

	result, err := s.GetTagsForRepository(ctx, repo.ID, store.TagFilter{}, store.ScrollPagination{Page: 1, PageSize: 10})
	if err != nil {
		t.Fatalf("GetTagsForRepository: %v", err)
	}
	if len(result.Tags) != 1 {
		t.Fatalf("expected 1 tag, got %d", len(result.Tags))
	}
	tag := result.Tags[0]

	if tag.ChartAppVersion != "6.7.0-app" {
		t.Errorf("appVersion: got %q", tag.ChartAppVersion)
	}
	if tag.ChartKubeVersion != ">=1.23.0-0" {
		t.Errorf("kubeVersion: got %q", tag.ChartKubeVersion)
	}
	if !tag.ChartDeprecated {
		t.Errorf("deprecated: got false")
	}
	want := []store.ChartDependency{
		{Name: "redis", Version: "18.x.x", Repository: "oci://registry-1.docker.io/bitnamicharts"},
		{Name: "common", Version: "2.0.0", Repository: "https://charts.example.com"},
	}
	if len(tag.ChartDependencies) != len(want) {
		t.Fatalf("dependencies: expected %v, got %v", want, tag.ChartDependencies)
	}
	for i := range want {
		if tag.ChartDependencies[i] != want[i] {
			t.Errorf("dependency %d: expected %v, got %v", i, want[i], tag.ChartDependencies[i])
		}
	}
}

func TestHelmTagWithoutOptionalMetadataHasEmptyDependencies(t *testing.T) {
	s, ctx := setupStore(t)

	reg := mustRegistry(t, s, ctx, "main", "https://main.io", "main.io")
	repo := mustRepository(t, s, ctx, reg.ID, "charts", "minimal")

	if _, err := s.UpsertConfigBlobByFields(ctx, "sha256:min-config", 80, `{"name":"minimal","version":"0.1.0","apiVersion":"v2"}`, "", "", nil); err != nil {
		t.Fatalf("UpsertConfigBlobByFields: %v", err)
	}
	mustManifest(t, s, ctx, "sha256:min-manifest", "application/vnd.oci.image.manifest.v1+json", "helm", "sha256:min-config", "", "", 1000)
	if _, err := s.UpsertTagWithSync(ctx, repo.ID, "0.1.0", "sha256:min-manifest", "helm", "application/vnd.oci.image.manifest.v1+json", 1.0); err != nil {
		t.Fatalf("UpsertTagWithSync: %v", err)
	}

	result, err := s.GetTagsForRepository(ctx, repo.ID, store.TagFilter{}, store.ScrollPagination{Page: 1, PageSize: 10})
	if err != nil {
		t.Fatalf("GetTagsForRepository: %v", err)
	}
	tag := result.Tags[0]
	if tag.ChartAppVersion != "" || tag.ChartKubeVersion != "" || tag.ChartDeprecated {
		t.Errorf("expected empty optional metadata, got appVersion=%q kubeVersion=%q deprecated=%v",
			tag.ChartAppVersion, tag.ChartKubeVersion, tag.ChartDeprecated)
	}
	if tag.ChartDependencies == nil || len(tag.ChartDependencies) != 0 {
		t.Errorf("expected an empty, non-nil dependency list, got %#v", tag.ChartDependencies)
	}
}
