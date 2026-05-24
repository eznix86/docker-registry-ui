package web

import (
	"context"
	"fmt"
	"io/fs"
	"net/http"
	"time"

	clog "github.com/charmbracelet/log"
	assets "github.com/eznix86/docker-registry-ui"
	"github.com/eznix86/docker-registry-ui/internal/progress"
	"github.com/eznix86/docker-registry-ui/internal/registry"
	"github.com/eznix86/docker-registry-ui/internal/store"
	"github.com/eznix86/docker-registry-ui/internal/sync"
	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/romsar/gonertia/v3"
)

type Server struct {
	router *router
}

type router struct {
	srv    *http.Server
	logger *clog.Logger
}

type Options struct {
	Store           *store.Store
	RegistryManager *registry.Manager
	Inertia         *gonertia.ViteInstance
	Broadcaster     *progress.WebSocketBroadcaster
	ManualSyncChan  sync.ManualSyncChannel
	Host            string
	Port            string
	Debug           bool
	ShowUsageBar    bool
}

func New(opts Options) (*Server, error) {
	if opts.Inertia == nil {
		return nil, fmt.Errorf("inertia instance is required")
	}
	if opts.Store == nil {
		return nil, fmt.Errorf("store is required")
	}
	if opts.Host == "" {
		opts.Host = "localhost"
	}
	if opts.Port == "" {
		opts.Port = "3000"
	}

	h := &handler{
		inertia:     opts.Inertia,
		store:       opts.Store,
		regManager:  opts.RegistryManager,
		broadcaster: opts.Broadcaster,
		manualCh:    opts.ManualSyncChan,
		showUsageBar:   opts.ShowUsageBar,
	}

	r := chi.NewRouter()
	addr := fmt.Sprintf("%s:%s", opts.Host, opts.Port)

	r.Use(chimw.StripSlashes)
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(chimw.Recoverer)

	// Public routes.
	r.Get("/healthz", h.health)
	if opts.Broadcaster != nil {
		r.HandleFunc("/ws/sync/progress", h.wsProgress)
	}
	r.Post("/api/sync/trigger", h.manualSync)

	// Tag deletion API.
	r.Delete("/r/{registry}/{repository}/tags", h.deleteTags)
	r.Delete("/r/{registry}/{namespace}/{repository}/tags", h.deleteTags)

	// Static assets.
	r.Group(func(group chi.Router) {
		group.Use(cacheAssets)
		publicFS, _ := fs.Sub(assets.PublicFS, "public")
		if publicFS != nil {
			group.Handle("/build/*", http.FileServer(http.FS(publicFS)))
			group.Handle("/public/*", http.StripPrefix("/public/", http.FileServer(http.FS(publicFS))))
		}
	})

	// Inertia page routes.
	r.Group(func(group chi.Router) {
		group.Use(opts.Inertia.CSPMiddleware(gonertia.WithCSPPolicy(cspPolicy())))
		group.Use(requestLogger(clog.Default()))
		if opts.Debug {
			group.Use(serverTiming())
		}
		group.Get("/", h.explore)
		group.Get("/r/{registry}", h.registryPage)
		group.Get("/r/{registry}/{repository}", h.repositoryPage)
		group.Get("/r/{registry}/{namespace}/{repository}", h.repositoryPage)
		group.NotFound(h.notFound)
	})

	return &Server{
		router: &router{
			srv: &http.Server{
				Addr:              addr,
				Handler:           r,
				ReadHeaderTimeout: 10 * time.Second,
			},
			logger: clog.Default(),
		},
	}, nil
}

func (s *Server) Start() error {
	s.router.logger.Infof("Server starting on %s", s.router.srv.Addr)
	return s.router.srv.ListenAndServe()
}

func (s *Server) Stop() {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := s.router.srv.Shutdown(ctx); err != nil {
		s.router.logger.Errorf("Server shutdown error: %v", err)
	}
	s.router.logger.Info("Server stopped")
}

// handler is defined in handlers.go.
