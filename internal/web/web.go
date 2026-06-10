package web

import (
	"context"
	"errors"
	"fmt"
	"io/fs"
	"net/http"
	"time"

	clog "github.com/charmbracelet/log"
	assets "github.com/eznix86/docker-registry-ui"
	"github.com/eznix86/docker-registry-ui/internal/helm"
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
	HelmReader      *helm.Reader
	Inertia         *gonertia.ViteInstance
	Broadcaster     *progress.WebSocketBroadcaster
	ManualSyncChan  sync.ManualSyncChannel
	AuthHandler     *AuthHandler
	Host            string
	Port            string
	Debug           bool
	ShowUsageBar    bool
}

func New(opts Options) (*Server, error) {
	if opts.Inertia == nil {
		return nil, errors.New("inertia instance is required")
	}
	if opts.Store == nil {
		return nil, errors.New("store is required")
	}
	if opts.Host == "" {
		opts.Host = "localhost"
	}
	if opts.Port == "" {
		opts.Port = "3000"
	}

	h := &handler{
		inertia:      opts.Inertia,
		store:        opts.Store,
		regManager:   opts.RegistryManager,
		helmReader:   opts.HelmReader,
		broadcaster:  opts.Broadcaster,
		manualCh:     opts.ManualSyncChan,
		authHandler:  opts.AuthHandler,
		showUsageBar: opts.ShowUsageBar,
	}

	r := chi.NewRouter()
	addr := fmt.Sprintf("%s:%s", opts.Host, opts.Port)

	r.Use(chimw.StripSlashes)
	r.Use(chimw.RequestID)
	r.Use(chimw.Recoverer)

	r.Get("/healthz", h.health)

	if opts.AuthHandler != nil && opts.AuthHandler.Enabled() {
		r.Get("/oauth/login", opts.AuthHandler.HandleLogin)
		r.Get("/oauth/callback", opts.AuthHandler.HandleCallback)
		r.Post("/oauth/logout", opts.AuthHandler.HandleLogout)
	}

	r.Group(func(group chi.Router) {
		group.Use(cacheAssets)
		publicFS, err := fs.Sub(assets.PublicFS, "public")
		if err != nil {
			clog.Warn("Failed to load public assets", "error", err)
			return
		}
		if publicFS != nil {
			group.Handle("/build/*", http.FileServer(http.FS(publicFS)))
			group.Handle("/public/*", http.StripPrefix("/public/", http.FileServer(http.FS(publicFS))))
		}
	})

	r.Group(func(group chi.Router) {
		if opts.AuthHandler != nil && opts.AuthHandler.Enabled() {
			group.Use(opts.AuthHandler.Middleware)
		}

		if opts.Broadcaster != nil {
			group.HandleFunc("/ws/sync/progress", h.wsProgress)
		}
		group.Post("/api/sync/trigger", h.manualSync)

		group.Delete("/r/{registry}/{repository}/tags", h.deleteTags)
		group.Delete("/r/{registry}/{namespace}/{repository}/tags", h.deleteTags)

		group.Get("/r/{registry}/{namespace}/{repository}/helm/{tag}/values", h.helmValues)
		group.Get("/r/{registry}/{namespace}/{repository}/helm/{tag}/files", h.helmFiles)

		group.Group(func(group chi.Router) {
			group.Use(opts.Inertia.CSPMiddleware(gonertia.WithCSPPolicy(cspPolicy())))
			group.Use(requestLogger(clog.Default()))
			group.Get("/", h.explore)
			group.Get("/r/{registry}", h.registryPage)
			group.Get("/r/{registry}/{repository}", h.repositoryPage)
			group.Get("/r/{registry}/{namespace}/{repository}", h.repositoryPage)
			group.NotFound(h.notFound)
		})
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
