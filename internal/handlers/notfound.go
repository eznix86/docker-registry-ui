// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

package handlers

import (
	"net/http"

	"github.com/romsar/gonertia/v2"
)

func (h *Handler) NotFound(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusNotFound)
	if err := h.inertia.Render(w, r, "NotFound", gonertia.Props{}); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}
