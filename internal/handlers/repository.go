// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

package handlers

import (
	"net/http"

	"github.com/romsar/gonertia/v2"
)

func (h *handler) RepositoryDetail(w http.ResponseWriter, r *http.Request) {
	if err := h.inertia.Render(w, r, "Repository", gonertia.Props{
		"repository": h.models.Repository.FindRepository("docker.io", nil, "busybox"),
		"tags":       h.models.Repository.ListTags(),
	}); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}
