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

package servertiming

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"
)

type Config struct {
	TimingAllowOrigin string
}

type Metric struct {
	Name        string
	Description string
	start       time.Time
	duration    time.Duration
	stopped     bool
}

func (m *Metric) Start() *Metric {
	m.start = time.Now()
	return m
}

func (m *Metric) Stop() {
	if !m.stopped {
		m.duration = time.Since(m.start)
		m.stopped = true
	}
}

type Collector struct {
	metrics []*Metric
}

func (c *Collector) NewMetric(name string) *Metric {
	m := &Metric{Name: name}
	c.metrics = append(c.metrics, m)
	return m
}

func (c *Collector) HeaderValue() string {
	var parts []string
	for _, m := range c.metrics {
		if !m.stopped {
			continue
		}
		if m.Description != "" {
			parts = append(parts, fmt.Sprintf("%s;dur=%.2f;desc=%q", m.Name, m.duration.Seconds()*1000, m.Description))
		} else {
			parts = append(parts, fmt.Sprintf("%s;dur=%.2f", m.Name, m.duration.Seconds()*1000))
		}
	}
	return strings.Join(parts, ", ")
}

type contextKey struct{}

var key = contextKey{}

func NewCollector() *Collector {
	return &Collector{}
}

func FromContext(ctx context.Context) *Collector {
	v := ctx.Value(key)
	if v == nil {
		return nil
	}
	return v.(*Collector)
}

func NewContext(ctx context.Context, c *Collector) context.Context {
	return context.WithValue(ctx, key, c)
}

type responseWriter struct {
	http.ResponseWriter
	collector *Collector
	metric    *Metric
	cfg       *Config
	written   bool
}

func (rw *responseWriter) WriteHeader(statusCode int) {
	if !rw.written {
		rw.metric.Stop()
		headerValue := rw.collector.HeaderValue()
		if headerValue != "" {
			rw.ResponseWriter.Header().Set("Server-Timing", headerValue)
		}
		if rw.cfg != nil && rw.cfg.TimingAllowOrigin != "" {
			rw.ResponseWriter.Header().Set("Timing-Allow-Origin", rw.cfg.TimingAllowOrigin)
		}
		rw.written = true
	}
	rw.ResponseWriter.WriteHeader(statusCode)
}

func (rw *responseWriter) Write(b []byte) (int, error) {
	if !rw.written {
		rw.WriteHeader(http.StatusOK)
	}
	return rw.ResponseWriter.Write(b)
}

func ServerTiming(cfg *Config) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			coll := NewCollector()
			ctx := NewContext(r.Context(), coll)

			start := coll.NewMetric("total").Start()

			// Wrap the response writer
			wrapper := &responseWriter{
				ResponseWriter: w,
				collector:      coll,
				metric:         start,
				cfg:            cfg,
			}

			// Run the next handler
			next.ServeHTTP(wrapper, r.WithContext(ctx))

			// Ensure the metric is stopped even if headers were never written
			start.Stop()
		})
	}
}
