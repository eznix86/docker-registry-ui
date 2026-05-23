package web

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/eznix86/docker-registry-ui/internal/store"
)

type explorePageFilters struct {
	Registries    []string `json:"registries"`
	Architectures []string `json:"architectures"`
	ShowUntagged  bool     `json:"showUntagged"`
	Search        string   `json:"search"`
}

type registryOption struct {
	Name   string `json:"name,omitempty"`
	Host   string `json:"host"`
	Status int    `json:"status"`
}

func parseExploreFilters(r *http.Request) store.RepositoryFilters {
	q := r.URL.Query()
	registries := q["registries"]
	for i, reg := range registries {
		registries[i] = strings.ReplaceAll(reg, "~", ":")
	}
	return store.RepositoryFilters{
		Registries:    registries,
		Architectures: q["architectures"],
		Search:        q.Get("search"),
		ShowUntagged:  q.Get("untagged") == "true",
	}
}

func exploreProps(f store.RepositoryFilters) explorePageFilters {
	return explorePageFilters{
		Registries:    f.Registries,
		Architectures: f.Architectures,
		ShowUntagged:  f.ShowUntagged,
		Search:        f.Search,
	}
}

func toRegistryOptions(registries []store.Registry) []registryOption {
	result := make([]registryOption, len(registries))
	for i, r := range registries {
		result[i] = registryOption{Name: r.Name, Host: r.Host, Status: r.Status}
	}
	return result
}

func parseTagFilter(r *http.Request) store.TagFilter {
	q := r.URL.Query()
	sortBy := q.Get("sortBy")
	if sortBy == "" {
		sortBy = "newest"
	}
	return store.TagFilter{
		SortBy: sortBy,
		Name:   q.Get("filter"),
	}
}

func parseScroll(r *http.Request, defaultSize int) store.ScrollPagination {
	q := r.URL.Query()
	page := 1
	if raw := q.Get("page"); raw != "" {
		var p int
		if _, err := fmt.Sscanf(raw, "%d", &p); err == nil && p > 0 {
			page = p
		}
	}
	return store.ScrollPagination{Page: page, PageSize: defaultSize}
}
