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
	"time"

	fake "github.com/brianvoe/gofakeit/v7"
	"github.com/eznix86/docker-registry-ui/internal/models"
	"gorm.io/gorm"
)

type ManifestFactory struct {
	*Factory[models.Manifest]
}

func NewManifestFactory(db *gorm.DB) *ManifestFactory {
	return &ManifestFactory{
		Factory: NewFactory(db, func() *models.Manifest {
			type Platform struct {
				OS   string
				Arch string
			}

			platforms := []Platform{
				{"linux", "amd64"},
				{"linux", "arm64"},
				{"linux", "arm/v7"},
				{"linux", "arm/v6"},
				{"linux", "386"},
				{"linux", "ppc64le"},
				{"linux", "s390x"},
				{"linux", "riscv64"},
				{"windows", "amd64"},
				{"windows", "arm64"},
				{"darwin", "amd64"},
				{"darwin", "arm64"},
			}

			platform := platforms[fake.Number(0, len(platforms)-1)]

			singleArchTypes := []string{
				"application/vnd.docker.distribution.manifest.v2+json",
				"application/vnd.oci.image.manifest.v1+json",
			}

			return &models.Manifest{
				Digest:       fmt.Sprintf("sha256:%s", fake.LetterN(64)),
				MediaType:    fake.RandomString(singleArchTypes),
				OS:           platform.OS,
				Architecture: platform.Arch,
				Created:      time.Now().Add(-time.Duration(fake.Number(1, 365*24)) * time.Hour).Format(time.RFC3339),
				SizeBytes:    int64(fake.Number(1000000, 500000000)),
			}
		}),
	}
}

func NewMultiArchManifestFactory(db *gorm.DB) *ManifestFactory {
	return &ManifestFactory{
		Factory: NewFactory(db, func() *models.Manifest {
			manifestListTypes := []string{
				"application/vnd.docker.distribution.manifest.list.v2+json",
				"application/vnd.oci.image.index.v1+json",
			}

			return &models.Manifest{
				Digest:       fmt.Sprintf("sha256:%s", fake.LetterN(64)),
				MediaType:    fake.RandomString(manifestListTypes),
				OS:           "",
				Architecture: "",
				Created:      time.Now().Add(-time.Duration(fake.Number(1, 365*24)) * time.Hour).Format(time.RFC3339),
				SizeBytes:    int64(fake.Number(1000000, 500000000)),
			}
		}),
	}
}

// WithDigest sets a custom digest for the manifest
func (f *ManifestFactory) WithDigest(digest string) *ManifestFactory {
	f.overrides = append(f.overrides, func(manifest *models.Manifest) {
		manifest.Digest = digest
	})
	return f
}

// WithArchitecture sets the architecture for the manifest
func (f *ManifestFactory) WithArchitecture(arch string) *ManifestFactory {
	f.overrides = append(f.overrides, func(manifest *models.Manifest) {
		manifest.Architecture = arch
	})
	return f
}

// WithManifestList sets the manifest list digest for platform-specific manifests
func (f *ManifestFactory) WithManifestList(manifestListDigest string) *ManifestFactory {
	f.overrides = append(f.overrides, func(manifest *models.Manifest) {
		manifest.ManifestListDigest = &manifestListDigest
	})
	return f
}
