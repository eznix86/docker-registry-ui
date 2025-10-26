// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

package routes

import (
	"fmt"
	"net/http"
	"strings"
)

// TODO: Detect if the user is using a local development environment and adjust the CSP policy accordingly.
const (
	cspScriptSrc      = "script-src 'self' 'unsafe-inline' https://localhost:5173 https://127.0.0.1:5173"
	cspStyleSrc       = "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://localhost:5173 https://127.0.0.1:5173"
	cspImgSrc         = "img-src 'self' data: https:"
	cspFontSrc        = "font-src 'self' data: https://fonts.gstatic.com"
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
