package web

import (
	"context"
	"net/http"
	"strconv"
	"strings"
	"sync"
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

type timingManager struct {
	mu      sync.Mutex
	metrics []timingMetric
}

type timingMetric struct {
	name     string
	duration time.Duration
}

func newTimingManager() *timingManager {
	return &timingManager{}
}

func (tm *timingManager) startMetric(name string) func() {
	start := time.Now()
	return func() {
		tm.mu.Lock()
		defer tm.mu.Unlock()
		tm.metrics = append(tm.metrics, timingMetric{name: name, duration: time.Since(start)})
	}
}

type timingTracker struct {
	tm      *timingManager
	metrics []timingMetric
}

func serverTiming() func(http.Handler) http.Handler {
	tm := newTimingManager()
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			tt := &timingTracker{tm: tm}
			ctx := contextWithTiming(r.Context(), tt)
			next.ServeHTTP(w, r.WithContext(ctx))

			// Build Server-Timing header.
			var parts []string
			tm.mu.Lock()
			for _, m := range tm.metrics {
				parts = append(parts, m.name+";dur="+strconv.FormatFloat(m.duration.Seconds()*1000, 'f', 2, 64))
			}
			tm.mu.Unlock()
			if len(parts) > 0 {
				w.Header().Set("Server-Timing", strings.Join(parts, ", "))
			}
		})
	}
}

type ctxKey string

const timingCtxKey ctxKey = "timing"

type timingContext struct {
	tracker *timingTracker
}

func contextWithTiming(ctx context.Context, tt *timingTracker) context.Context {
	return context.WithValue(ctx, timingCtxKey, &timingContext{tracker: tt})
}

func timingFromContext(ctx context.Context) *timingTracker {
	if tc, ok := ctx.Value(timingCtxKey).(*timingContext); ok {
		return tc.tracker
	}
	return nil
}
