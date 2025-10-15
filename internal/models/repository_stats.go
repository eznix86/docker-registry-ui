// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

package models

import "time"

type RepositoryStats struct {
	ID            uint      `gorm:"primaryKey"`
	RegistryID    uint      `gorm:"column:registry_id;not null"`
	Name          string    `gorm:"column:name;not null"`
	RegistryName  string    `gorm:"column:registry_name"`
	TagsCount     int64     `gorm:"column:tags_count;default:0"`
	TotalSize     int64     `gorm:"column:total_size;default:0"`
	Architectures string    `gorm:"column:architectures"`
	UpdatedAt     time.Time `gorm:"column:updated_at"`
}

func (RepositoryStats) TableName() string {
	return "repository_stats"
}
