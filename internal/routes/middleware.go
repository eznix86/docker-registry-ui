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
	"fmt"
	"net/http"
	"strings"
)

// TODO: Detect if the user is using a local development environment and adjust the CSP policy accordingly.
const (
	cspScriptSrc      = "script-src 'self' 'unsafe-inline' localhost:5173 127.0.0.1:5173"
	cspStyleSrc       = "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://reinhart1010.github.io localhost:5173 127.0.0.1:5173"
	cspImgSrc         = "img-src 'self'"
	cspFontSrc        = "font-src 'self' data: https://fonts.gstatic.com https://reinhart1010.github.io"
	cspConnectSrc     = "connect-src 'self' https://localhost:5173 https://127.0.0.1:5173 wss://127.0.0.1:5173"
	cspFrameAncestors = "frame-ancestors 'none'"
	cspBaseURI        = "base-uri 'self'"
)

func buildCSPPolicy() string {
	return fmt.Sprintf(
		"%s; %s; %s; %s; %s; %s; %s",
		cspScriptSrc,
		cspStyleSrc,
		cspImgSrc,
		cspFontSrc,
		cspConnectSrc,
		cspFrameAncestors,
		cspBaseURI,
	)
}

func cspMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		csp := buildCSPPolicy()
		w.Header().Set("Content-Security-Policy", csp)

		next.ServeHTTP(w, r)
	})
}

func cacheControlMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path

		switch {
		case strings.HasPrefix(path, "/build/assets/"):
			w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		case strings.HasPrefix(path, "/build/"):
			w.Header().Set("Cache-Control", "public, max-age=3600")
		case strings.HasPrefix(path, "/public/"):
			w.Header().Set("Cache-Control", "public, max-age=604800")
		}

		next.ServeHTTP(w, r)
	})
}
