package explorer

import (
	"context"
	"strings"
)

type Fake struct{}

func (f Fake) Explore(ctx context.Context, req ExploreRequest) (*ExploreResponse, error) {
	registries := []Registry{
		{
			Name:   "docker.io",
			Status: "online",
		},
		{
			Name:   "gcr.io",
			Status: "online",
		},
		{
			Name:   "registry.k8s.io",
			Status: "online",
		},
		{
			Name:   "quay.io",
			Status: "online",
		},
		{
			Name:   "localhost:5000",
			Status: "offline",
		},
	}

	repositories := []Repository{
		{
			Name:          "nginx",
			Registry:      "docker.io",
			Size:          142857600, // ~136 MB
			Architectures: []string{"amd64", "arm64", "arm/v7"},
			CrawlState:    "completed",
			LastSyncedAt:  "2025-10-08T10:30:00Z",
		},
		{
			Name:          "redis",
			Registry:      "docker.io",
			Size:          104857600, // ~100 MB
			Architectures: []string{"amd64", "arm64", "arm/v7", "ppc64le", "s390x"},
			CrawlState:    "completed",
			LastSyncedAt:  "2025-10-08T09:15:00Z",
		},
		{
			Name:          "postgres",
			Registry:      "docker.io",
			Size:          314572800, // ~300 MB
			Architectures: []string{"veryunique"},
			CrawlState:    "completed",
			LastSyncedAt:  "2025-10-08T08:45:00Z",
		},
		{
			Name:          "alpine",
			Registry:      "docker.io",
			Size:          5242880, // ~5 MB
			Architectures: []string{"amd64", "arm64", "arm/v7", "arm/v6", "ppc64le", "s390x", "386"},
			CrawlState:    "completed",
			LastSyncedAt:  "2025-10-08T11:00:00Z",
		},
		{
			Name:          "ubuntu",
			Registry:      "docker.io",
			Size:          73400320, // ~70 MB
			Architectures: []string{"amd64", "arm64", "arm/v7", "ppc64le", "s390x"},
			CrawlState:    "completed",
			LastSyncedAt:  "2025-10-08T07:20:00Z",
		},
		{
			Name:          "pause",
			Registry:      "registry.k8s.io",
			Size:          716800, // ~700 KB
			Architectures: []string{"amd64", "arm64", "arm", "ppc64le", "s390x"},
			CrawlState:    "completed",
			LastSyncedAt:  "2025-10-08T06:30:00Z",
		},
		{
			Name:          "etcd",
			Registry:      "registry.k8s.io",
			Size:          52428800, // ~50 MB
			Architectures: []string{"amd64", "arm64", "ppc64le", "s390x"},
			CrawlState:    "completed",
			LastSyncedAt:  "2025-10-08T05:45:00Z",
		},
		{
			Name:          "kube-proxy",
			Registry:      "registry.k8s.io",
			Size:          83886080, // ~80 MB
			Architectures: []string{"amd64", "arm64", "arm", "ppc64le", "s390x"},
			CrawlState:    "in-progress",
			LastSyncedAt:  "2025-10-08T04:15:00Z",
		},
		{
			Name:          "prometheus/prometheus",
			Registry:      "quay.io",
			Size:          209715200, // ~200 MB
			Architectures: []string{"amd64", "arm64", "arm/v7", "ppc64le", "s390x"},
			CrawlState:    "completed",
			LastSyncedAt:  "2025-10-08T03:30:00Z",
		},
		{
			Name:          "grafana/grafana",
			Registry:      "docker.io",
			Size:          268435456, // ~256 MB
			Architectures: []string{"amd64", "arm64", "arm/v7"},
			CrawlState:    "failed",
			LastSyncedAt:  "2025-10-07T22:10:00Z",
		},
		{
			Name:          "google-containers/pause",
			Registry:      "gcr.io",
			Size:          716800, // ~700 KB
			Architectures: []string{"amd64", "arm64"},
			CrawlState:    "completed",
			LastSyncedAt:  "2025-10-08T02:45:00Z",
		},
		{
			Name:          "my-app",
			Registry:      "localhost:5000",
			Size:          67108864, // ~64 MB
			Architectures: []string{"amd64"},
			CrawlState:    "pending",
			LastSyncedAt:  "2025-10-07T20:00:00Z",
		},
	}

	// Simple filtering based on request parameters
	filteredRepositories := []Repository{}
	for _, repo := range repositories {
		// Filter by query if provided
		if req.Query != "" {
			if !contains(repo.Name, req.Query) && !contains(repo.Registry, req.Query) {
				continue
			}
		}

		// Filter by architecture if provided
		if req.Architecture != "" {
			if !containsString(repo.Architectures, req.Architecture) {
				continue
			}
		}

		filteredRepositories = append(filteredRepositories, repo)
	}

	return &ExploreResponse{
		Registries:   registries,
		Repositories: filteredRepositories,
	}, nil
}

func (f Fake) Details(ctx context.Context, registry, image string) (*DetailsResponse, error) {
	return &DetailsResponse{}, nil
}

// Helper functions for filtering
func contains(s, substr string) bool {
	return strings.Contains(strings.ToLower(s), strings.ToLower(substr))
}

func containsString(slice []string, item string) bool {
	for _, s := range slice {
		if strings.EqualFold(s, item) {
			return true
		}
	}
	return false
}
