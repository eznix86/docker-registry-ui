// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025  Bruno Bernard
//
// This file is part of Docker Registry UI (Container Hub).
//
// Docker Registry UI is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
//
// Docker Registry UI is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.

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
