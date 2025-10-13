// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

package routes

import (
	"github.com/eznix86/docker-registry-ui/internal/handlers"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

func NewRouter() *chi.Mux {
	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(middleware.StripSlashes)

	r.Get("/", handlers.Explore)
	r.Get("/r/{registry}/{repository}", handlers.RepositoryDetail)

	return r
}
