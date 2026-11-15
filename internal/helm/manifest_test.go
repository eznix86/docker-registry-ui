package helm

import (
	"errors"
	"testing"

	registryclient "github.com/eznix86/registry-client"
)

func TestFindHelmLayerReturnsTheChartContentLayer(t *testing.T) {
	m := &registryclient.ManifestResponse{RawContent: []byte(`{
		"schemaVersion": 2,
		"mediaType": "application/vnd.oci.image.manifest.v1+json",
		"config": {"mediaType": "application/vnd.cncf.helm.config.v1+json", "digest": "sha256:cfg", "size": 120},
		"layers": [
			{"mediaType": "application/vnd.cncf.helm.chart.provenance.v1.prov", "digest": "sha256:prov", "size": 10},
			{"mediaType": "application/vnd.cncf.helm.chart.content.v1.tar+gzip", "digest": "sha256:chart", "size": 3000}
		]
	}`)}

	digest, err := findHelmLayer(m)
	if err != nil {
		t.Fatalf("findHelmLayer: %v", err)
	}
	if digest != "sha256:chart" {
		t.Fatalf("expected sha256:chart, got %s", digest)
	}
}

func TestFindHelmLayerRejectsAnImageManifest(t *testing.T) {
	m := &registryclient.ManifestResponse{RawContent: []byte(`{
		"schemaVersion": 2,
		"layers": [{"mediaType": "application/vnd.oci.image.layer.v1.tar+gzip", "digest": "sha256:layer", "size": 3000}]
	}`)}

	if _, err := findHelmLayer(m); !errors.Is(err, ErrNotHelmChart) {
		t.Fatalf("expected ErrNotHelmChart, got %v", err)
	}
}
