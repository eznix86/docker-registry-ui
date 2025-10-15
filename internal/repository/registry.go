// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

package repository

import (
	"github.com/eznix86/docker-registry-ui/internal/models"
	"gorm.io/gorm"
)

type RegistryRepository struct {
	db *gorm.DB
}

func NewRegistryRepository(db *gorm.DB) *RegistryRepository {
	return &RegistryRepository{db: db}
}

func (r *RegistryRepository) FindAll() ([]models.Registry, error) {
	var registries []models.Registry
	if err := r.db.Find(&registries).Error; err != nil {
		return nil, err
	}
	return registries, nil
}

func (r *RegistryRepository) FindByName(name string) (*models.Registry, error) {
	var registry models.Registry
	if err := r.db.Where("name = ?", name).First(&registry).Error; err != nil {
		return nil, err
	}
	return &registry, nil
}
