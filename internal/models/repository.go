// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

package models

type Repository struct {
	ID         uint   `gorm:"primaryKey"`
	RegistryID uint   `gorm:"column:registry_id;not null;index"`
	Name       string `gorm:"column:name;type:text;not null"`

	// Relationships
	Registry *Registry        `gorm:"foreignKey:RegistryID;references:ID"`
	Tags     []Tag            `gorm:"foreignKey:RepoID;references:ID"`
	Stats    *RepositoryStats `gorm:"foreignKey:ID;references:ID"`
}

func (Repository) TableName() string {
	return "repositories"
}
