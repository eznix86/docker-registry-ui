// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

package factories

import (
	"fmt"

	fake "github.com/brianvoe/gofakeit/v7"
	"github.com/eznix86/docker-registry-ui/internal/models"
	"gorm.io/gorm"
)

type ManifestLayerFactory struct {
	*Factory[models.ManifestLayer]
}

func NewManifestLayerFactory(db *gorm.DB) *ManifestLayerFactory {
	return &ManifestLayerFactory{
		Factory: NewFactory(db, func() *models.ManifestLayer {
			return &models.ManifestLayer{
				LayerDigest: fmt.Sprintf("sha256:%s", fake.LetterN(64)),
				SizeBytes:   int64(fake.Number(100000, 100000000)),
			}
		}),
	}
}

// WithManifest sets the manifest digest for the layer
func (f *ManifestLayerFactory) WithManifest(manifestDigest string) *ManifestLayerFactory {
	f.overrides = append(f.overrides, func(layer *models.ManifestLayer) {
		layer.ManifestDigest = manifestDigest
	})
	return f
}

// WithLayerDigest sets a custom layer digest
func (f *ManifestLayerFactory) WithLayerDigest(digest string) *ManifestLayerFactory {
	f.overrides = append(f.overrides, func(layer *models.ManifestLayer) {
		layer.LayerDigest = digest
	})
	return f
}
