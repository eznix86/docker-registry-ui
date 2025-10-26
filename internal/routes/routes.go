// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

package routes

import (
	"embed"
	"io/fs"
	"net/http"
	"time"

	"github.com/eznix86/docker-registry-ui/internal/handlers"
	"github.com/eznix86/docker-registry-ui/internal/utils/servertiming"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

func NewRouter(publicFS embed.FS, h *handlers.Handler) (*chi.Mux, error) {
	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(middleware.StripSlashes)
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(60 * time.Second))
	r.Use(cspMiddleware)
	r.Use(servertiming.ServerTiming(&servertiming.Config{
		TimingAllowOrigin: "*",
	}))

	// Create sub filesystem for public directory
	publicSubFS, err := fs.Sub(publicFS, "public")
	if err != nil {
		return nil, err
	}

	r.Get("/", h.Explore)
	r.Get("/r/{registry}/{repository}", h.RepositoryDetail)
	r.Get("/r/{registry}/{namespace}/{repository}", h.RepositoryDetail)

	// Serve static assets with cache headers
	r.With(cacheControlMiddleware).Handle("/build/*", http.FileServer(http.FS(publicSubFS)))
	r.With(cacheControlMiddleware).Handle("/public/*", http.StripPrefix("/public/", http.FileServer(http.FS(publicSubFS))))

	r.NotFound(h.NotFound)

	return r, nil
}
