package sync

import (
	"github.com/eznix86/docker-registry-ui/backend/internal/models"
	"gorm.io/gorm"
)

type FullSync struct {
	db *gorm.DB
}

func NewFullSync(db *gorm.DB) *FullSync {
	return &FullSync{db: db}
}

func (f *FullSync) SyncAllRegistries() error {
	configs := models.LoadRegistriesFromEnv()

	models.SyncRegistries(f.db, configs)

	return nil
}

func (f *FullSync) GetRegistries() []models.Registry {
	var registries []models.Registry
	f.db.Find(&registries)
	return registries
}

func (f *FullSync) GetRepositories() []models.Repository {
	var repositories []models.Repository
	f.db.Preload("Registry").Find(&repositories)
	return repositories
}

func (f *FullSync) ResolveHealth() error {
	for _, registry := range f.GetRegistries() {
		registry.HttpStatusCode = registry.GetStatus()
		f.db.Save(&registry)
	}

	return nil
}

func (f *FullSync) SyncRepositories() error {
	for _, registry := range f.GetRegistries() {
		catalog, err := registry.GetClient().GetCatalog()

		if err != nil {
			return err
		}

		models.SyncRepositories(f.db, registry, catalog.Repositories)
	}

	return nil
}

func (f *FullSync) SyncTags() error {
	for _, repository := range f.GetRepositories() {

		tags, err := repository.Registry.GetClient().GetTags(repository.FullName)

		if err != nil {
			return err
		}

		models.SyncTags(f.db, repository, tags.Tags)
	}

	return nil
}
