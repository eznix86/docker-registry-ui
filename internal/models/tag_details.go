// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

package models

import "time"

type TagDetails struct {
	ID              uint      `gorm:"primaryKey"`
	RepoID          uint      `gorm:"column:repo_id;not null"`
	Name            string    `gorm:"column:name;not null"`
	Digest          string    `gorm:"column:digest;not null"`
	EarliestCreated string    `gorm:"column:earliest_created"`
	UpdatedAt       time.Time `gorm:"column:updated_at"`

	// Relationships for eager loading
	Manifest *Manifest `gorm:"foreignKey:Digest;references:Digest"`
}

func (TagDetails) TableName() string {
	return "tag_details"
}
