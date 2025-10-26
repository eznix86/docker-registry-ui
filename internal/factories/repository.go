// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

package factories

import (
	"fmt"

	fake "github.com/brianvoe/gofakeit/v7"
	"github.com/eznix86/docker-registry-ui/internal/models"
	"gorm.io/gorm"
)

type RepositoryFactory struct {
	*Factory[models.Repository]
	usedNames map[string]bool
	counter   int
}

func NewRepositoryFactory(db *gorm.DB) *RepositoryFactory {
	rf := &RepositoryFactory{
		usedNames: make(map[string]bool),
		counter:   0,
	}

	rf.Factory = NewFactory(db, func() *models.Repository {
		prefixes := []string{
			"nginx", "redis", "postgres", "mysql", "mongodb",
			"node", "python", "golang", "alpine", "ubuntu",
			"debian", "centos", "apache", "haproxy",
			"traefik", "caddy", "jenkins", "gitlab", "prometheus",
			"grafana", "elasticsearch", "kibana", "logstash", "rabbitmq",
			"kafka", "zookeeper", "consul", "vault", "etcd",
			"memcached", "mariadb", "cassandra", "influxdb", "timescaledb",
		}

		suffixes := []string{
			"", "-server", "-client", "-worker", "-api",
			"-service", "-app", "-dev", "-prod", "-staging",
		}

		namespaces := []string{
			"library", "bitnami", "hashicorp", "confluentinc",
			"elastic", "grafana", "prometheus", "docker",
			"alpine", "ubuntu", "debian", "redhat",
			"microsoft", "google", "amazon", "oracle",
		}

		var name string
		maxAttempts := 100

		// Try to generate a unique name
		for attempt := 0; attempt < maxAttempts; attempt++ {
			baseName := fake.RandomString(prefixes) + fake.RandomString(suffixes)

			if fake.Number(1, 10) <= 4 {
				namespace := fake.RandomString(namespaces)
				name = namespace + "/" + baseName
			} else {
				name = baseName
			}

			// Check if name is unique
			if !rf.usedNames[name] {
				rf.usedNames[name] = true
				break
			}

			// If we've tried many times, fall back to counter-based naming
			if attempt == maxAttempts-1 {
				rf.counter++
				name = fmt.Sprintf("%s-%d", fake.RandomString(prefixes), fake.Number(1, 99999))
				rf.usedNames[name] = true
			}
		}

		return &models.Repository{
			Name: name,
		}
	})

	return rf
}

// WithRegistry sets the registry ID for the repository
func (f *RepositoryFactory) WithRegistry(registryID uint) *RepositoryFactory {
	f.overrides = append(f.overrides, func(repo *models.Repository) {
		repo.RegistryID = registryID
	})
	return f
}
