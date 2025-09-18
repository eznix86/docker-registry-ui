package main

import (
	"log"
	"net/http"
	"time"

	"github.com/eznix86/docker-registry-ui/backend/internal/app"
	"github.com/eznix86/docker-registry-ui/backend/internal/config"
	"github.com/eznix86/docker-registry-ui/backend/internal/handlers"
	httpHelper "github.com/eznix86/docker-registry-ui/backend/internal/helpers/http"
	"github.com/eznix86/docker-registry-ui/backend/internal/sync"
	"github.com/eznix86/docker-registry-ui/backend/internal/utils"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"go.uber.org/dig"
)

func main() {
	container := app.Initialize()

	if err := registerProviders(container); err != nil {
		log.Fatal("Failed to register providers:", err)
	}

	if err := container.Invoke(func(router *chi.Mux) {

		utils.GracefulShutdown(func() error {
			app.Dispatcher().Stop()
			return config.CloseDatabase(app.DB())
		})

		log.Println("Starting server on :8080")
		log.Fatal(http.ListenAndServe(":8080", router))
	}); err != nil {
		log.Fatal("Failed to start application:", err)
	}
}

func registerProviders(container *dig.Container) error {
	if err := container.Provide(config.NewInertia); err != nil {
		return err
	}

	if err := container.Provide(config.NewDatabase); err != nil {
		return err
	}

	if err := container.Provide(sync.NewFullSync); err != nil {
		return err
	}

	if err := container.Provide(func() *utils.Dispatcher {
		return utils.New(5, 100)
	}); err != nil {
		return err
	}

	if err := container.Provide(httpHelper.NewViewRenderer); err != nil {
		return err
	}

	if err := container.Provide(newRouter); err != nil {
		return err
	}

	return nil
}

func newRouter(v *httpHelper.ViewRenderer) *chi.Mux {
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(60 * time.Second))

	r.Handle("/build/*", http.StripPrefix("/build/", http.FileServer(http.Dir("public/build"))))
	r.Handle("/public/*", http.StripPrefix("/public/", http.FileServer(http.Dir("public"))))

	r.Get("/healthz", v.Render(handlers.HealthHandler))
	r.Get("/", v.Render(handlers.ExploreHandler))
	r.Get("/r", v.Render(handlers.RepositoryHandler))
	r.Post("/api/refresh", v.Render(handlers.RefreshHandler))
	r.Get("/manual/refresh", v.Render(handlers.RefreshHandler))

	return r
}
