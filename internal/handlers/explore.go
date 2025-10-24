// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

package handlers

import (
	"net/http"
	"strings"

	"github.com/eznix86/docker-registry-ui/internal/utils/servertiming"
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

func (h *Handler) Explore(w http.ResponseWriter, r *http.Request) {
	t := servertiming.FromContext(r.Context())

	f := t.NewMetric("filters").Start()

	filters := parseExploreFilters(r)

	f.Stop()

	db := t.NewMetric("db").Start()

	architectures, err := h.services.Repository.GetAllArchitectures()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	registries, err := h.services.Registry.GetAll()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	db.Stop()

	repoMetric := t.NewMetric("repositories").Start()
	repoResult, err := h.services.Repository.Filter(
		filters.Registries,
		filters.Architectures,
		filters.ShowUntagged,
		filters.Search,
	)
	repoMetric.Stop()

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	res := t.NewMetric("render").Start()
	defer res.Stop()

	if err := h.inertia.Render(w, r, "Explore", gonertia.Props{
		"architectures":     architectures,
		"totalRepositories": int(repoResult.Total),
		"registries":        registries,
		"repositories":      repoResult.Repositories,
		"filters":           filters,
	}); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}
