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
	"strconv"
	"strings"

	"github.com/eznix86/docker-registry-ui/internal/service"
	"github.com/eznix86/docker-registry-ui/internal/utils/servertiming"
	"github.com/go-chi/chi/v5"
	"github.com/romsar/gonertia/v2"
)

type TagFilters struct {
	SortBy string `json:"sortBy"`
	Filter string `json:"filter"`
	Page   int    `json:"-"`
}

func parseTagFilters(r *http.Request) TagFilters {
	filters := TagFilters{
		SortBy: "newest",
	}

	if sortBy := r.URL.Query().Get("sortBy"); sortBy != "" {
		filters.SortBy = sortBy
	}

	filters.Filter = r.URL.Query().Get("filter")

	filters.Page = 1
	if pageStr := r.URL.Query().Get("page"); pageStr != "" {
		if parsedPage, err := strconv.Atoi(pageStr); err == nil && parsedPage > 0 {
			filters.Page = parsedPage
		}
	}

	return filters
}

func (h *Handler) RepositoryDetail(w http.ResponseWriter, r *http.Request) {
	t := servertiming.FromContext(r.Context())

	db := t.NewMetric("db").Start()
	registryParam := chi.URLParam(r, "registry")
	namespace := chi.URLParam(r, "namespace")
	repositoryName := chi.URLParam(r, "repository")

	// Convert ~ to : to support both formats (localhost~5001 and localhost:5001)
	registryHost := strings.ReplaceAll(registryParam, "~", ":")

	var namespacePtr *string
	if namespace != "" {
		namespacePtr = &namespace
	}

	repository, err := h.services.Repository.FindRepositoryByHost(registryHost, namespacePtr, repositoryName)
	if err != nil {
		h.inertia.Redirect(w, r, "/404")
		return
	}

	filters := parseTagFilters(r)

	paginatedTags, err := h.services.Repository.ListTagsWithFilters(repository.ID, service.TagFilterParams{
		SortBy:   filters.SortBy,
		Search:   filters.Filter,
		Page:     filters.Page,
		PageSize: 5,
	})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	db.Stop()

	render := t.NewMetric("render").Start()
	defer render.Stop()

	if err := h.inertia.Render(w, r, "Repository", gonertia.Props{
		"repository": repository,
		"tags": gonertia.Scroll(paginatedTags.Tags, gonertia.WithMetadata(gonertia.ScrollMetadata{
			PageName:     "page",
			CurrentPage:  paginatedTags.CurrentPage,
			NextPage:     paginatedTags.NextPage,
			PreviousPage: paginatedTags.PreviousPage,
		})),
		"filters": filters,
	}); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}
