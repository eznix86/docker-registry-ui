// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

package factories

import (
	"fmt"
	"strings"

	fake "github.com/brianvoe/gofakeit/v7"
	"github.com/eznix86/docker-registry-ui/internal/models"
	"gorm.io/gorm"
)

func NewRegistryFactory(db *gorm.DB) *Factory[models.Registry] {
	return NewFactory(db, func() *models.Registry {
		registryNames := []string{
			"docker.io",
			"gcr.io",
			"ghcr.io",
			"quay.io",
			"registry.gitlab.com",
			"mcr.microsoft.com",
			"public.ecr.aws",
		}

		var name, host string
		if fake.Bool() {
			name = fake.RandomString(registryNames)
			host = name
		} else {
			subdomain := strings.ToLower(fake.Word())
			domain := fake.DomainName()
			name = fmt.Sprintf("%s.%s", subdomain, domain)
			host = name
		}

		return &models.Registry{
			Name:   name,
			Host:   host,
			Status: fake.RandomInt([]int{200, 502, 403}),
		}
	})
}
