// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

package handlers

import (
	"net/http"
	"strconv"

	"github.com/eznix86/docker-registry-ui/internal/utils/servertiming"
	"github.com/go-chi/chi/v5"
	"github.com/romsar/gonertia/v2"
)

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
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	sortBy := r.URL.Query().Get("sortBy")
	if sortBy == "" {
		sortBy = "newest"
	}
	filter := r.URL.Query().Get("filter")

	page := 1
	if pageStr := r.URL.Query().Get("page"); pageStr != "" {
		if parsedPage, err := strconv.Atoi(pageStr); err == nil && parsedPage > 0 {
			page = parsedPage
		}
	}

	paginatedTags, err := h.services.Repository.ListTagsWithFilters(repository.ID, sortBy, filter, page)
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
		"filters": map[string]string{
			"sortBy": sortBy,
			"filter": filter,
		},
	}); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}
