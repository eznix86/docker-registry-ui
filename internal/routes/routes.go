// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

package routes

import (
	"embed"
	"io/fs"
	"log"
	"net/http"
	"time"

	"github.com/eznix86/docker-registry-ui/internal/handlers"
	"github.com/eznix86/docker-registry-ui/pkg/inertia"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/romsar/gonertia/v2"
)

func NewRouter(publicFS embed.FS) *chi.Mux {
	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(middleware.StripSlashes)
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(60 * time.Second))

	gi, err := gonertia.NewFromFileFS(publicFS, "resources/views/app.html")
	if err != nil {
		log.Fatal(err)
	}

	i, err := inertia.NewWithVite(gi)

	if err != nil {
		log.Fatal(err)
	}

	h := handlers.NewHandler(i)

	// Create sub filesystem for public directory
	publicSubFS, err := fs.Sub(publicFS, "public")
	if err != nil {
		log.Fatal(err)
	}

	r.Get("/", h.Explore)
	r.Get("/r/{registry}/{repository}", h.RepositoryDetail)
	r.Get("/r/{registry}/{namespace}/{repository}", h.RepositoryDetail)
	r.Handle("/build/*", http.StripPrefix("/build/", http.FileServer(http.FS(publicSubFS))))
	r.Handle("/public/*", http.StripPrefix("/public/", http.FileServer(http.FS(publicSubFS))))

	r.NotFound(h.NotFound)

	return r
}
