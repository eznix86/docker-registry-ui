// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

package repository

import (
	"github.com/eznix86/docker-registry-ui/internal/models"
	"gorm.io/gorm"
)

type ManifestRepository struct {
	db *gorm.DB
}

func NewManifestRepository(db *gorm.DB) *ManifestRepository {
	return &ManifestRepository{db: db}
}

func (r *ManifestRepository) GetAllArchitectures() ([]string, error) {
	var architectures []string
	if err := r.db.Model(&models.Manifest{}).
		Where("architecture != ''").
		Distinct("architecture").
		Pluck("architecture", &architectures).Error; err != nil {
		return nil, err
	}
	return architectures, nil
}
