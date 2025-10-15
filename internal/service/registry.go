// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

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
