package web

import (
	"net/http"
	"time"

	clog "github.com/charmbracelet/log"
)

func cspPolicy() string {
	return "default-src 'self'; " +
		"script-src 'self' 'unsafe-inline' http://localhost:* http://127.0.0.1:*; " +
		"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://reinhart1010.github.io http://localhost:* http://127.0.0.1:*; " +
		"font-src 'self' data: https://fonts.gstatic.com https://reinhart1010.github.io; " +
		"img-src 'self' data:; " +
		"connect-src 'self' https://api.github.com ws: wss: http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:*"
}

func cacheAssets(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		next.ServeHTTP(w, r)
	})
}

func requestLogger(logger *clog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			ww := &responseWriter{ResponseWriter: w, status: 200}
			next.ServeHTTP(ww, r)
			logger.Info("request",
				"method", r.Method,
				"path", r.URL.Path,
				"status", ww.status,
				"duration", time.Since(start).String(),
			)
		})
	}
}

type responseWriter struct {
	http.ResponseWriter
	status int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.status = code
	rw.ResponseWriter.WriteHeader(code)
}
