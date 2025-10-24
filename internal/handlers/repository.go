// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

package handlers

import (
	"net/http"
	"strconv"

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
	registryName := chi.URLParam(r, "registry")
	namespace := chi.URLParam(r, "namespace")
	repositoryName := chi.URLParam(r, "repository")

	var namespacePtr *string
	if namespace != "" {
		namespacePtr = &namespace
	}

	repository, err := h.services.Repository.FindRepository(registryName, namespacePtr, repositoryName)
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
