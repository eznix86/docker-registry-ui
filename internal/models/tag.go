// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

package models

type Tag struct {
	ID     uint   `gorm:"primaryKey"`
	RepoID uint   `gorm:"column:repo_id;not null;index"`
	Name   string `gorm:"column:name;type:text;not null"`
	Digest string `gorm:"column:digest;type:text;not null"`

	Repository *Repository `gorm:"foreignKey:RepoID;references:ID"`
	Manifest   *Manifest   `gorm:"foreignKey:Digest;references:Digest"`
}

func (Tag) TableName() string {
	return "tags"
}
