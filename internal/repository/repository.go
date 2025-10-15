// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

package repository

import (
	"github.com/eznix86/docker-registry-ui/internal/models"
	"gorm.io/gorm"
)

type RepositoryRepository struct {
	db *gorm.DB
}

func NewRepositoryRepository(db *gorm.DB) *RepositoryRepository {
	return &RepositoryRepository{db: db}
}

func (r *RepositoryRepository) FindAllStats() ([]models.RepositoryStats, error) {
	var stats []models.RepositoryStats
	if err := r.db.Find(&stats).Error; err != nil {
		return nil, err
	}
	return stats, nil
}

func (r *RepositoryRepository) FindByRegistryAndName(registryID uint, name string) (*models.Repository, error) {
	var repository models.Repository
	if err := r.db.Where("registry_id = ? AND name = ?", registryID, name).
		Preload("Registry").
		First(&repository).Error; err != nil {
		return nil, err
	}
	return &repository, nil
}

func (r *RepositoryRepository) FindStatsByID(id uint) (*models.RepositoryStats, error) {
	var stats models.RepositoryStats
	if err := r.db.Where("id = ?", id).First(&stats).Error; err != nil {
		return nil, err
	}
	return &stats, nil
}
