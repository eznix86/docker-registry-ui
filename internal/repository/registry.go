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
