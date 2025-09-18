package app

import (
	"github.com/eznix86/docker-registry-ui/backend/internal/sync"
	"github.com/eznix86/docker-registry-ui/backend/internal/utils"
	"github.com/go-chi/chi/v5"
	"go.uber.org/dig"
	"gorm.io/gorm"
)

var container *dig.Container

func Initialize() *dig.Container {
	container = dig.New()
	return container
}

func DB() *gorm.DB {
	var result *gorm.DB
	container.Invoke(func(db *gorm.DB) {
		result = db
	})
	return result
}

func Dispatcher() *utils.Dispatcher {
	var result *utils.Dispatcher
	container.Invoke(func(d *utils.Dispatcher) {
		result = d
	})
	return result
}

func FullSync() *sync.FullSync {
	var result *sync.FullSync
	container.Invoke(func(fs *sync.FullSync) {
		result = fs
	})
	return result
}

func Router() *chi.Mux {
	var result *chi.Mux
	container.Invoke(func(r *chi.Mux) {
		result = r
	})
	
	return result
}