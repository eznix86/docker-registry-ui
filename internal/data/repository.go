// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

package data

import (
	"strings"
	"time"

	"github.com/eznix86/docker-registry-ui/internal/utils"
)

type RepositoryModel struct{}

type Repository struct {
	Name          string   `json:"name"`
	Registry      string   `json:"registry"`
	Namespace     *string  `json:"namespace"`
	Size          int      `json:"totalSizeInBytes"`
	Architectures []string `json:"architectures"`
	TagsCount     int      `json:"tagsCount"`
}

type Image struct {
	Digest       string    `json:"digest"`
	CreatedAt    time.Time `json:"createdAt"`
	OS           string    `json:"os"`
	Architecture string    `json:"architecture"`
	Variant      string    `json:"variant"`
	Size         int       `json:"size"`
	LastUpdated  time.Time `json:"lastUpdated"`
}
type Tag struct {
	Name      string    `json:"name"`
	Digest    string    `json:"digest"`
	CreatedAt time.Time `json:"createdAt"`
	Images    []Image   `json:"images"`
	Alias     []string  `json:"aliases"`
}

func (r *RepositoryModel) GetAll() []Repository {
	return r.getAllRepositories()
}

func (r *RepositoryModel) Filter(registries []string, architectures []string, showUntagged bool, search string) []Repository {
	repos := r.getAllRepositories()
	filtered := []Repository{}

	for _, repo := range repos {
		if !matchesRegistries(repo, registries) {
			continue
		}

		if !matchesArchitectures(repo, architectures) {
			continue
		}

		if !matchesUntaggedFilter(repo, showUntagged) {
			continue
		}

		if !matchesSearch(repo, search) {
			continue
		}

		filtered = append(filtered, repo)
	}

	return filtered
}

func matchesRegistries(repo Repository, registries []string) bool {
	if len(registries) == 0 {
		return true
	}

	for _, reg := range registries {
		if repo.Registry == reg {
			return true
		}
	}
	return false
}

func matchesArchitectures(repo Repository, architectures []string) bool {
	if len(architectures) == 0 {
		return true
	}

	for _, arch := range architectures {
		for _, repoArch := range repo.Architectures {
			if repoArch == arch {
				return true
			}
		}
	}
	return false
}

func matchesUntaggedFilter(repo Repository, showUntagged bool) bool {
	if !showUntagged && repo.TagsCount == 0 {
		return false
	}
	return true
}

func matchesSearch(repo Repository, search string) bool {
	if search == "" {
		return true
	}

	searchLower := strings.ToLower(search)
	repoName := strings.ToLower(repo.Name)
	namespace := ""
	if repo.Namespace != nil {
		namespace = strings.ToLower(*repo.Namespace)
	}

	return strings.Contains(repoName, searchLower) ||
		strings.Contains(namespace, searchLower)
}

func (r *RepositoryModel) getAllRepositories() []Repository {
	return []Repository{
		{
			Name:          "busybox",
			Registry:      "docker.io",
			Namespace:     utils.StrPtr("library"),
			Size:          16000000,
			Architectures: []string{"amd64", "armv5", "arm/v6", "arm/v7", "arm64/v8", "386", "ppc64le", "riscv64", "s390x"},
			TagsCount:     1,
		},
		{
			Name:          "alpine",
			Registry:      "docker.io",
			Namespace:     utils.StrPtr("library"),
			Size:          123872109,
			Architectures: []string{"amd64", "armv5", "arm/v6", "arm/v7", "arm64/v8", "386", "ppc64le", "riscv64", "s390x"},
			TagsCount:     10,
		},
		{
			Name:          "hello-world",
			Registry:      "docker.io",
			Namespace:     utils.StrPtr("demo"),
			Size:          12398219387,
			Architectures: []string{"amd64", "armv5", "arm/v6", "arm/v7", "arm64/v8", "386", "ppc64le", "riscv64", "s390x"},
			TagsCount:     10,
		},
		{
			Name:          "postgres",
			Registry:      "docker.io",
			Namespace:     utils.StrPtr("library"),
			Size:          0,
			Architectures: []string{},
			TagsCount:     0,
		},
		{
			Name:          "redis",
			Registry:      "docker.io",
			Namespace:     nil,
			Size:          0,
			Architectures: []string{},
			TagsCount:     0,
		},
	}
}

func (r *RepositoryModel) Total() int {
	return 10
}

func (r *RepositoryModel) GetAllArchitectures() []string {
	return []string{"amd64", "armv5", "arm/v6", "arm/v7", "arm64/v8", "386", "ppc64le", "riscv64", "s390x"}
}

func (r *RepositoryModel) FindRepository(registryName string, namespace *string, repository string) Repository {
	return Repository{
		Name:          "busybox",
		Registry:      "docker.io",
		Namespace:     utils.StrPtr("library"),
		Size:          16000000,
		Architectures: []string{"amd64", "armv5", "arm/v6", "arm/v7", "arm64/v8", "386", "ppc64le", "riscv64", "s390x"},
		TagsCount:     1,
	}
}

func (r *RepositoryModel) ListTags() []Tag {
	return []Tag{
		{
			Name:      "stable",
			Digest:    "sha256:4a35a",
			CreatedAt: time.Now(),
			Alias:     []string{"v2.0", "latest"},
			Images: []Image{
				{
					Digest:       "sha256:4a35a",
					CreatedAt:    time.Now(),
					OS:           "linux",
					Architecture: "amd64",
					Variant:      "v8",
					Size:         123129,
					LastUpdated:  time.Now(),
				},
				{
					Digest:       "sha256:4a1235a",
					CreatedAt:    time.Now(),
					OS:           "darwin",
					Architecture: "amd64",
					Variant:      "v8",
					Size:         218937,
					LastUpdated:  time.Now(),
				},
			},
		},
		{
			Name:      "1.0.0",
			Digest:    "sha256:4a35a",
			CreatedAt: time.Now(),
			Alias:     []string{},
			Images: []Image{
				{
					Digest:       "sha256:4a35a",
					CreatedAt:    time.Now(),
					OS:           "linux",
					Architecture: "amd64",
					Variant:      "v8",
					Size:         123129,
					LastUpdated:  time.Now(),
				},
			},
		},
	}
}
