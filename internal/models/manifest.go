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

package models

type Manifest struct {
	Digest             string `gorm:"column:digest;type:text;primaryKey"`
	MediaType          string `gorm:"column:media_type;type:text;not null"`
	OS                 string `gorm:"column:os;type:text"`
	Architecture       string `gorm:"column:architecture;type:text"`
	Created            string `gorm:"column:created;type:text"`
	SizeBytes          int64  `gorm:"column:size_bytes;default:0"`
	ManifestListDigest string `gorm:"column:manifest_list_digest;type:text"`

	Layers            []ManifestLayer `gorm:"foreignKey:ManifestDigest;references:Digest"`
	ManifestList      *Manifest       `gorm:"foreignKey:ManifestListDigest;references:Digest"`
	PlatformManifests []Manifest      `gorm:"foreignKey:ManifestListDigest;references:Digest"`
}

func (Manifest) TableName() string {
	return "manifests"
}
