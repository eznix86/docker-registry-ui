// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

package config

import (
	"context"
	"embed"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/caarlos0/env/v6"
	"github.com/eznix86/docker-registry-ui/internal/handlers"
	"github.com/eznix86/docker-registry-ui/internal/routes"
	"github.com/eznix86/docker-registry-ui/internal/service"
	"github.com/eznix86/docker-registry-ui/internal/utils"
	"github.com/go-chi/chi/v5"
	"github.com/joho/godotenv"
	"github.com/romsar/gonertia/v2"
	"gorm.io/gorm"
)

type Config struct {
	Port              string        `env:"PORT" envDefault:"3000"`
	Host              string        `env:"HOST" envDefault:"localhost"`
	DatabasePath      string        `env:"DATABASE_PATH" envDefault:"database/database.db"`
	ReadHeaderTimeout time.Duration `env:"READ_HEADER_TIMEOUT" envDefault:"5s"`
	ShutdownTimeout   time.Duration `env:"SHUTDOWN_TIMEOUT" envDefault:"30s"`
	EnableTLS         bool          `env:"ENABLE_TLS" envDefault:"false"`
	TLSCertFile       string        `env:"TLS_CERT_FILE" envDefault:"certs/localhost.pem"`
	TLSKeyFile        string        `env:"TLS_KEY_FILE" envDefault:"certs/localhost-key.pem"`
}

type Application struct {
	Server       *http.Server
	Router       *chi.Mux
	DB           *gorm.DB
	Inertia      *gonertia.ViteInstance
	Handlers     *handlers.Handler
	Services     *service.Services
	Config       *Config
	PublicFS     embed.FS
	MigrationsFS embed.FS
}

func NewApplication(publicFS, migrationsFS embed.FS, cfg *Config) (*Application, error) {
	app := &Application{
		PublicFS:     publicFS,
		MigrationsFS: migrationsFS,
		Config:       cfg,
	}

	if err := app.initDatabase(); err != nil {
		return nil, fmt.Errorf("failed to initialize database: %w", err)
	}

	if err := app.initInertia(); err != nil {
		return nil, fmt.Errorf("failed to initialize inertia: %w", err)
	}

	app.initServices()

	app.initHandlers()

	if err := app.initRouter(); err != nil {
		return nil, fmt.Errorf("failed to initialize router: %w", err)
	}

	app.initServer()

	return app, nil
}

func (app *Application) initDatabase() error {

	db, err := NewDatabase(app.MigrationsFS, app.Config.DatabasePath)

	if err != nil {
		return err
	}

	err = utils.PrintPath(app.PublicFS, ".")

	if err != nil {
		return err
	}

	app.DB = db
	return nil
}

func (app *Application) initInertia() error {
	gi, err := gonertia.NewFromFileFS(app.PublicFS, "resources/views/app.html")

	if err != nil {
		return err
	}

	err = utils.PrintPath(app.PublicFS, ".")

	if err != nil {
		return err
	}

	i, err := gonertia.NewViteFromFS(
		gi,
		app.PublicFS,
		gonertia.WithIntegrity(),
		gonertia.WithAggressivePreload(),
	)
	if err != nil {
		return err
	}

	app.Inertia = i
	return nil
}

func (app *Application) initHandlers() {
	app.Handlers = handlers.NewHandler(app.Inertia, app.Services)
}

func (app *Application) initRouter() error {
	router, err := routes.NewRouter(app.PublicFS, app.Handlers)
	if err != nil {
		return err
	}
	app.Router = router
	return nil
}

func (app *Application) initServer() {
	addr := fmt.Sprintf("%s:%s", app.Config.Host, app.Config.Port)
	app.Server = &http.Server{
		Addr:              addr,
		Handler:           app.Router,
		ReadHeaderTimeout: app.Config.ReadHeaderTimeout,
	}
}

func (app *Application) initServices() {
	app.Services = service.NewServices(app.DB)
}

func (app *Application) tlsEnabled() bool {
	if !app.Config.EnableTLS {
		return false
	}
	certExists := fileExists(app.Config.TLSCertFile)
	keyExists := fileExists(app.Config.TLSKeyFile)
	return certExists && keyExists
}

func fileExists(filename string) bool {
	info, err := os.Stat(filename)
	if os.IsNotExist(err) {
		return false
	}
	return !info.IsDir()
}

func (app *Application) Start() error {
	addr := app.Server.Addr

	if app.tlsEnabled() {
		fmt.Printf("Starting server with TLS on https://%s/\n", addr)
		return app.Server.ListenAndServeTLS(app.Config.TLSCertFile, app.Config.TLSKeyFile)
	}

	fmt.Printf("Starting server on http://%s/\n", addr)
	return app.Server.ListenAndServe()
}

func (app *Application) Shutdown(ctx context.Context) error {
	log.Println("Shutting down server gracefully...")

	if err := app.Server.Shutdown(ctx); err != nil {
		return fmt.Errorf("server shutdown failed: %w", err)
	}

	if app.DB != nil {
		sqlDB, err := app.DB.DB()
		if err == nil {
			if err := sqlDB.Close(); err != nil {
				log.Printf("Error closing database: %v", err)
			} else {
				log.Println("Database connection closed")
			}
		}
	}

	// - Background workers: app.Worker.Stop()

	log.Println("Server shutdown complete")
	return nil
}

func DefaultConfig() *Config {

	if !utils.IsInContainerContext() {
		err := godotenv.Load()
		if err != nil {
			log.Fatalf("unable to load .env file: %e", err)
		}
	}

	cfg := Config{}

	err := env.Parse(&cfg)

	if err != nil {
		log.Fatalf("unable to parse ennvironment variables: %e", err)
	}

	return &cfg
}
