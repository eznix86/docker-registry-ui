// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

package handlers

import (
	"net/http"
	"strings"

	"github.com/romsar/gonertia/v2"
)

type ExploreFilters struct {
	Registries    []string `json:"registries"`
	Architectures []string `json:"architectures"`
	ShowUntagged  bool     `json:"showUntagged"`
	Search        string   `json:"search"`
}

func parseExploreFilters(r *http.Request) ExploreFilters {
	query := r.URL.Query()

	filters := ExploreFilters{
		Registries:    []string{},
		Architectures: []string{},
		ShowUntagged:  query.Get("untagged") == "true",
		Search:        query.Get("search"),
	}

	if registries := query.Get("registries"); registries != "" {
		filters.Registries = strings.Split(registries, ",")
	}

	if architectures := query.Get("architectures"); architectures != "" {
		filters.Architectures = strings.Split(architectures, ",")
	}

	return filters
}

func (h *handler) Explore(w http.ResponseWriter, r *http.Request) {
	filters := parseExploreFilters(r)

	// Apply filters to repositories
	repositories := h.models.Repository.Filter(
		filters.Registries,
		filters.Architectures,
		filters.ShowUntagged,
		filters.Search,
	)

	if err := h.inertia.Render(w, r, "Explore", gonertia.Props{
		"architectures":     h.models.Repository.GetAllArchitectures(),
		"totalRepositories": len(repositories),
		"registries":        h.models.Registry.GetAll(),
		"repositories":      repositories,
		"filters":           filters,
	}); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}
