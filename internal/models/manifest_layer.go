// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

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
