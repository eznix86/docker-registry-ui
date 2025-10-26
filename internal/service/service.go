// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

package service

import (
	"github.com/eznix86/docker-registry-ui/internal/repository"
	"gorm.io/gorm"
)

type Services struct {
	Registry   *RegistryService
	Repository *RepositoryService
}

func NewServices(db *gorm.DB) *Services {
	registryRepo := repository.NewRegistryRepository(db)
	repoRepo := repository.NewRepositoryRepository(db)
	tagRepo := repository.NewTagRepository(db)
	manifestRepo := repository.NewManifestRepository(db)

	return &Services{
		Registry:   NewRegistryService(registryRepo),
		Repository: NewRepositoryService(repoRepo, registryRepo, tagRepo, manifestRepo),
	}
}
