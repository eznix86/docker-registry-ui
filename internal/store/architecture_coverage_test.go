package store_test

import (
	"testing"

	"github.com/eznix86/docker-registry-ui/internal/store"
)

func TestArchitectureCoverageCountsRepositoriesOfSingleAndMultiArchImages(t *testing.T) {
	s, ctx := setupStore(t)

	reg := mustRegistry(t, s, ctx, "main", "https://main.io", "main.io")

	single := mustRepository(t, s, ctx, reg.ID, "lib", "single")
	mustManifest(t, s, ctx, "sha256:single-amd64", "application/vnd.oci.image.manifest.v1+json", "image", "sha256:cfg-s", "linux", "amd64", 100)
	mustTag(t, s, ctx, single.ID, "v1", "sha256:single-amd64")
	mustTag(t, s, ctx, single.ID, "v2", "sha256:single-amd64")

	singleArm64 := mustRepository(t, s, ctx, reg.ID, "lib", "single-arm64")
	mustManifest(t, s, ctx, "sha256:single-arm64", "application/vnd.oci.image.manifest.v1+json", "image", "sha256:cfg-s2", "linux", "arm64", 100)
	mustTag(t, s, ctx, singleArm64.ID, "v1", "sha256:single-arm64")

	multi := mustRepository(t, s, ctx, reg.ID, "lib", "multi")
	mustManifest(t, s, ctx, "sha256:multi-index", "application/vnd.oci.image.index.v1+json", "index", "", "", "", 0)
	platforms := []struct{ digest, arch, variant string }{
		{"sha256:multi-amd64", "amd64", ""},
		{"sha256:multi-arm64v8", "arm64", "v8"},
		{"sha256:multi-armv7", "arm", "v7"},
	}
	for i, p := range platforms {
		if _, err := s.UpsertManifestByFields(ctx, p.digest, "application/vnd.oci.image.manifest.v1+json", "image", `{}`, "sha256:cfg-"+p.arch, "linux", p.arch, p.variant, 100, nil); err != nil {
			t.Fatalf("UpsertManifestByFields: %v", err)
		}
		if err := s.LinkManifestPlatform(ctx, "sha256:multi-index", p.digest, "linux", p.arch, p.variant, i, 100); err != nil {
			t.Fatalf("LinkManifestPlatform: %v", err)
		}
	}
	mustTag(t, s, ctx, multi.ID, "v1", "sha256:multi-index")
	mustTag(t, s, ctx, multi.ID, "v2", "sha256:multi-index")

	other := mustRegistry(t, s, ctx, "other", "https://other.io", "other.io")
	otherRepo := mustRepository(t, s, ctx, other.ID, "lib", "elsewhere")
	mustManifest(t, s, ctx, "sha256:other-s390x", "application/vnd.oci.image.manifest.v1+json", "image", "sha256:cfg-o", "linux", "s390x", 100)
	mustTag(t, s, ctx, otherRepo.ID, "v1", "sha256:other-s390x")

	coverage, err := s.GetRegistryArchitectureCoverage(ctx, "main.io")
	if err != nil {
		t.Fatalf("GetRegistryArchitectureCoverage: %v", err)
	}
	want := []store.ArchitectureCoverageView{
		{Architecture: "amd64", RepositoryCount: 2},
		{Architecture: "arm64", RepositoryCount: 2},
		{Architecture: "arm/v7", RepositoryCount: 1},
	}
	if len(coverage) != len(want) {
		t.Fatalf("expected %v, got %v", want, coverage)
	}
	for i := range want {
		if coverage[i] != want[i] {
			t.Fatalf("expected %v, got %v", want, coverage)
		}
	}

	stats, err := s.GetRegistryStats(ctx, "main.io")
	if err != nil {
		t.Fatalf("GetRegistryStats: %v", err)
	}
	if stats.ArchitectureCount != 3 {
		t.Fatalf("expected 3 architectures, got %d", stats.ArchitectureCount)
	}
}
