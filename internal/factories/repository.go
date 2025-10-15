// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

package factories

import (
	fake "github.com/brianvoe/gofakeit/v7"
	"github.com/eznix86/docker-registry-ui/internal/models"
	"gorm.io/gorm"
)

type RepositoryFactory struct {
	*Factory[models.Repository]
}

func NewRepositoryFactory(db *gorm.DB) *RepositoryFactory {
	return &RepositoryFactory{
		Factory: NewFactory(db, func() *models.Repository {
			prefixes := []string{
				"nginx", "redis", "postgres", "mysql", "mongodb",
				"node", "python", "golang", "alpine", "ubuntu",
				"debian", "centos", "nginx", "apache", "haproxy",
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

			baseName := fake.RandomString(prefixes) + fake.RandomString(suffixes)

			var name string
			if fake.Number(1, 10) <= 4 {
				namespace := fake.RandomString(namespaces)
				name = namespace + "/" + baseName
			} else {
				name = baseName
			}

			return &models.Repository{
				Name: name,
			}
		}),
	}
}

// WithRegistry sets the registry ID for the repository
func (f *RepositoryFactory) WithRegistry(registryID uint) *RepositoryFactory {
	f.overrides = append(f.overrides, func(repo *models.Repository) {
		repo.RegistryID = registryID
	})
	return f
}
