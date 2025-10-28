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
