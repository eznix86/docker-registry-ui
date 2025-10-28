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

type ManifestLayer struct {
	ManifestDigest string `gorm:"column:manifest_digest;type:text;primaryKey;index"`
	LayerDigest    string `gorm:"column:layer_digest;type:text;primaryKey"`
	SizeBytes      int64  `gorm:"column:size_bytes;not null"`

	// Relationships
	Manifest *Manifest `gorm:"foreignKey:ManifestDigest;references:Digest"`
}

func (ManifestLayer) TableName() string {
	return "manifest_layers"
}
