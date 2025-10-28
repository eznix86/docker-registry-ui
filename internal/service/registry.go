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

package service

import (
	"github.com/eznix86/docker-registry-ui/internal/repository"
)

type RegistryService struct {
	registryRepo *repository.RegistryRepository
}

func NewRegistryService(registryRepo *repository.RegistryRepository) *RegistryService {
	return &RegistryService{
		registryRepo: registryRepo,
	}
}

func (s *RegistryService) GetAll() ([]Registry, error) {
	registries, err := s.registryRepo.FindAll()
	if err != nil {
		return nil, err
	}

	result := make([]Registry, 0, len(registries))
	for _, reg := range registries {
		result = append(result, Registry{
			Name:   reg.Name,
			Host:   reg.Host,
			Status: reg.Status,
		})
	}

	return result, nil
}
