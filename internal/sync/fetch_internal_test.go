package sync

import (
	"context"
	"testing"
)

func TestSingleArchImageKeepsPlatformVariantFromConfig(t *testing.T) {
	configDigest := "sha256:cfg-armv7"
	configJSON := `{"architecture":"arm","os":"linux","variant":"v7","created":"2026-01-01T00:00:00Z"}`

	blob, err := parseConfigBlob([]byte(configJSON))
	if err != nil {
		t.Fatalf("parseConfigBlob: %v", err)
	}
	f := newFetcher(nil)
	f.configs.set(configDigest, &cachedBlob{blob: blob, json: configJSON})

	g := &ManifestGraph{
		Digest:    "sha256:manifest-armv7",
		MediaType: "application/vnd.oci.image.manifest.v1+json",
		Kind:      KindImage,
		Raw: []byte(`{"config":{"mediaType":"application/vnd.oci.image.config.v1+json","size":100,"digest":"` + configDigest + `"},` +
			`"layers":[{"mediaType":"application/vnd.oci.image.layer.v1.tar+gzip","size":1000,"digest":"sha256:layer"}]}`),
	}

	if err := g.buildSingle(context.Background(), nil, f, "lib/alpine", "default"); err != nil {
		t.Fatalf("buildSingle: %v", err)
	}

	if len(g.Platforms) != 1 {
		t.Fatalf("expected 1 platform, got %d", len(g.Platforms))
	}
	p := g.Platforms[0]
	if p.OS != "linux" || p.Architecture != "arm" || p.Variant != "v7" {
		t.Fatalf("expected linux/arm/v7, got %s/%s/%s", p.OS, p.Architecture, p.Variant)
	}
}
