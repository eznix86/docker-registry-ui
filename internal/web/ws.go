package web

import (
	"net/http"
	"net/url"
	"strings"

	clog "github.com/charmbracelet/log"
	"github.com/gorilla/websocket"
)

var wsUpgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		if origin == "" {
			return true
		}
		parsed, err := url.Parse(origin)
		if err != nil {
			return false
		}
		return strings.EqualFold(parsed.Host, r.Host)
	},
}

func (h *handler) wsProgress(w http.ResponseWriter, r *http.Request) {
	if h.broadcaster == nil {
		http.Error(w, "WebSocket not configured", http.StatusServiceUnavailable)
		return
	}

	conn, err := wsUpgrader.Upgrade(w, r, nil)
	if err != nil {
		clog.Error("WebSocket upgrade failed", "error", err)
		return
	}

	h.broadcaster.Add(conn)

	go func() {
		defer h.broadcaster.Remove(conn)
		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				break
			}
		}
	}()
}
