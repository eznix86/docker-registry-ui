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
