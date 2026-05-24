package app

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	_ "net/http/pprof"

	clog "github.com/charmbracelet/log"
	assets "github.com/eznix86/docker-registry-ui"
	"github.com/eznix86/docker-registry-ui/internal/progress"
	"github.com/eznix86/docker-registry-ui/internal/registry"
	"github.com/eznix86/docker-registry-ui/internal/store"
	"github.com/eznix86/docker-registry-ui/internal/sync"
	"github.com/eznix86/docker-registry-ui/internal/version"
	"github.com/eznix86/docker-registry-ui/internal/web"
	"github.com/romsar/gonertia/v3"
	"github.com/spf13/cobra"
)

func Run() error {
	return rootCmd().Execute()
}

type ctxKey string

const ctxKeyConfig ctxKey = "config"

func rootCmd() *cobra.Command {
	v := version.New()
	cmd := &cobra.Command{
		Use:     "container-hub",
		Short:   "Docker Registry UI",
		Version: v.Short(),
		PersistentPreRun: func(cmd *cobra.Command, _ []string) {
			cfg, err := LoadConfig(cmd.Flags())
			if err != nil {
				clog.Fatal("Failed to load config", "error", err)
			}
			if cfg.App.Debug {
				startPprof()
			}
			cmd.SetContext(context.WithValue(cmd.Context(), ctxKeyConfig, cfg))
		},
	}
	cmd.PersistentFlags().CountP("verbose", "v", "increase verbosity")
	cmd.PersistentFlags().BoolP("debug", "d", false, "enable debug mode")

	cmd.AddCommand(startCmd())
	cmd.AddCommand(serveCmd())
	cmd.AddCommand(syncCmd())
	cmd.AddCommand(seedCmd())
	cmd.AddCommand(versionCmd())
	return cmd
}

func startCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "start",
		Short: "Start web server and background sync",
		Run: func(cmd *cobra.Command, _ []string) {
			cfg := cmd.Context().Value(ctxKeyConfig).(*Config)
			runStart(cfg)
		},
	}
	addServerFlags(cmd)
	addSyncFlags(cmd)
	return cmd
}

func serveCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "serve",
		Short: "Start web server only",
		Run: func(cmd *cobra.Command, _ []string) {
			cfg := cmd.Context().Value(ctxKeyConfig).(*Config)
			runServe(cfg)
		},
	}
	addServerFlags(cmd)
	return cmd
}

func syncCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "sync",
		Short: "Run sync once",
		Run: func(cmd *cobra.Command, _ []string) {
			cfg := cmd.Context().Value(ctxKeyConfig).(*Config)
			runSync(cfg)
		},
	}
	addSyncFlags(cmd)
	return cmd
}

func seedCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "seed",
		Short: "Seed database with test data",
		Run: func(cmd *cobra.Command, _ []string) {
			cfg := cmd.Context().Value(ctxKeyConfig).(*Config)
			runSeed(cfg)
		},
	}
	addDBFlags(cmd)
	return cmd
}

func versionCmd() *cobra.Command {
	var short bool
	cmd := &cobra.Command{
		Use:   "version",
		Short: "Print version",
		Run: func(_ *cobra.Command, _ []string) {
			v := version.New()
			if short {
				fmt.Println(v.Short())
			} else {
				fmt.Println(v.String())
			}
		},
	}
	cmd.Flags().BoolVarP(&short, "short", "s", false, "short version")
	return cmd
}

func addServerFlags(cmd *cobra.Command) {
	cmd.Flags().StringP("host", "H", "localhost", "Host")
	cmd.Flags().StringP("port", "p", "3000", "Port")
	cmd.Flags().String("database-url", "data/ui.db", "SQLite path")
	cmd.Flags().Bool("show-sql", false, "Log SQL queries")
}

func addSyncFlags(cmd *cobra.Command) {
	cmd.Flags().Int("workers", 20, "Worker count")
	cmd.Flags().Int("max-per-registry", 0, "Max concurrent per registry")
	cmd.Flags().Bool("show-progress", false, "Show CLI progress bar")
	cmd.Flags().Duration("sync-interval", 30*time.Second, "Sync interval")
}

func addDBFlags(cmd *cobra.Command) {
	cmd.Flags().String("database-url", "data/ui.db", "SQLite path")
	cmd.Flags().Bool("show-sql", false, "Log SQL queries")
}

type runtime struct {
	store      *store.Store
	regManager *registry.Manager
	syncSvc    *sync.Service
	server     *web.Server
	tracker    *progress.Tracker
}

func newRuntime(cfg *Config) (*runtime, error) {
	s, err := store.New(context.Background(), cfg.Database.URL)
	if err != nil {
		return nil, fmt.Errorf("create store: %w", err)
	}
	reg, err := registry.New(cfg.RegistryList, cfg.Scraper.HttpMaxRetries, cfg.App.DisableTagDeletion)
	if err != nil {
		s.Close()
		return nil, fmt.Errorf("create registry manager: %w", err)
	}
	return &runtime{store: s, regManager: reg}, nil
}

func (r *runtime) initSync(cfg *Config, showProgress bool) error {
	r.tracker = progress.NewTracker()
	if showProgress {
		go progress.RenderCLI(r.tracker)
	}
	svc, err := sync.New(sync.Deps{
		Store:           r.store,
		RegistryManager: r.regManager,
		Progress:        r.tracker,
		Config: sync.Config{
			Workers:                 cfg.Scraper.Workers,
			MaxPerRegistry:          cfg.Scraper.MaxPerRegistry,
			Debug:                   cfg.Scraper.Debug,
			SyncInterval:            cfg.Scraper.SyncInterval,
			CircuitBreakerThreshold: cfg.Scraper.CircuitBreakerThreshold,
		},
	})
	if err != nil {
		return fmt.Errorf("create sync service: %w", err)
	}
	r.syncSvc = svc
	return nil
}

func (r *runtime) initServer(cfg *Config, withSync bool) error {
	var ws *progress.WebSocketBroadcaster
	var manualCh sync.ManualSyncChannel
	if withSync && r.syncSvc != nil {
		manualCh = r.syncSvc.ManualSyncChan()
		ws = progress.NewWebSocketBroadcaster()
		go ws.Run()
		go progress.RenderWebSocket(r.tracker, ws.Send)
	}

	inertia, err := newInertia(cfg)
	if err != nil {
		return fmt.Errorf("create inertia: %w", err)
	}

	srv, err := web.New(web.Options{
		Store:           r.store,
		RegistryManager: r.regManager,
		Inertia:         inertia,
		Broadcaster:     ws,
		ManualSyncChan:  manualCh,
		Host:            cfg.Server.Host,
		Port:            cfg.Server.Port,
		Debug:           cfg.Server.Debug,
		ShowUsageBar:    cfg.App.ShowUsageBar,
	})
	if err != nil {
		return fmt.Errorf("create server: %w", err)
	}
	r.server = srv
	return nil
}

func (r *runtime) close() {
	if r.server != nil {
		r.server.Stop()
	}
	if r.syncSvc != nil {
		r.syncSvc.Stop()
	}
	if r.store != nil {
		r.store.Close()
	}
}

func newInertia(cfg *Config) (*gonertia.ViteInstance, error) {
	gi, err := gonertia.NewFromFileFS(assets.PublicFS, "resources/views/app.html")
	if err != nil {
		return nil, err
	}
	i, err := gonertia.NewViteFromFS(gi, assets.PublicFS,
		gonertia.WithIntegrity(),
		gonertia.WithAggressivePreload(),
	)
	if err != nil {
		return nil, err
	}
	i.ShareProp("disableTagDeletion", cfg.App.DisableTagDeletion)
	i.ShareProp("appVersion", version.New().Short())
	i.ShareProp("showUsageBar", cfg.App.ShowUsageBar)
	return i, nil
}

func runStart(cfg *Config) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	r, err := newRuntime(cfg)
	if err != nil {
		clog.Fatal(err)
	}
	defer r.close()

	if err := r.initSync(cfg, cfg.Scraper.ShowProgress); err != nil {
		clog.Fatal(err)
	}
	if err := r.initServer(cfg, true); err != nil {
		clog.Fatal(err)
	}

	go r.server.Start()
	go r.syncSvc.StartBackground(ctx)

	waitForSignal()
	cancel()
}

func runServe(cfg *Config) {
	r, err := newRuntime(cfg)
	if err != nil {
		clog.Fatal(err)
	}
	defer r.close()

	if err := r.initServer(cfg, false); err != nil {
		clog.Fatal(err)
	}

	go r.server.Start()
	waitForSignal()
}

func runSync(cfg *Config) {
	ctx := context.Background()
	r, err := newRuntime(cfg)
	if err != nil {
		clog.Fatal(err)
	}
	defer r.close()

	if err := r.initSync(cfg, cfg.Scraper.ShowProgress); err != nil {
		clog.Fatal(err)
	}

	result, err := r.syncSvc.Run(ctx)
	if err != nil {
		clog.Fatal("Sync failed", "error", err)
	}
	sync.ShowResult(result)
}

func runSeed(cfg *Config) {
	s, err := store.New(context.Background(), cfg.Database.URL)
	if err != nil {
		clog.Fatal("Failed to open database", "error", err)
	}
	defer s.Close()

	if err := s.Seed(context.Background()); err != nil {
		clog.Fatal("Seed failed", "error", err)
	}
	clog.Info("Database seeded")
}

func waitForSignal() {
	ch := make(chan os.Signal, 1)
	signal.Notify(ch, os.Interrupt, syscall.SIGTERM)
	<-ch
	clog.Info("Signal received, stopping")
}

func startPprof() {
	go func() {
		clog.Info("pprof server on http://localhost:6060/debug/pprof/")
		srv := &http.Server{Addr: "localhost:6060", ReadHeaderTimeout: 5 * time.Second}
		if err := srv.ListenAndServe(); err != nil {
			clog.Error("pprof error", "error", err)
		}
	}()
}
