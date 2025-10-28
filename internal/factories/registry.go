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
