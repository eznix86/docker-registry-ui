// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

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
