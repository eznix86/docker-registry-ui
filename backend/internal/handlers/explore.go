package handlers

import (
	"net/http"

	"github.com/eznix86/docker-registry-ui/backend/internal/app"
	v "github.com/eznix86/docker-registry-ui/backend/internal/helpers/http"
	"github.com/eznix86/docker-registry-ui/backend/internal/models"
	"github.com/eznix86/docker-registry-ui/backend/internal/presenters"
	inertia "github.com/romsar/gonertia/v2"
	"github.com/samber/lo"
)

// ExploreHandler returns a view to be rendered
func ExploreHandler(w http.ResponseWriter, r *http.Request) *v.Response {
	return v.InertiaView("Explore", inertia.Props{
		"repositories": inertia.Defer(func() (interface{}, error) {
			repositories := app.FullSync().GetRepositories()
			repositoryViews := lo.Map(repositories, func(repo models.Repository, _ int) *presenters.RepositoryView {
				return repo.ToPresenter()
			})

			return repositoryViews, nil
		}),
		"sources": inertia.Defer(func() (interface{}, error) {
			registries := app.FullSync().GetRegistries()
			sourcesMap := lo.KeyBy(registries, func(registry models.Registry) string {
				return registry.Host
			})
			sourcesView := lo.MapValues(sourcesMap, func(registry models.Registry, _ string) *presenters.SourceView {
				return registry.ToPresenter()
			})
			return sourcesView, nil
		}),
		"availableArchitectures": inertia.Defer(func() (interface{}, error) {
			repositories := app.FullSync().GetRepositories()
			allArchs := lo.FlatMap(repositories, func(repo models.Repository, _ int) []string {
				return []string(repo.Architectures)
			})
			uniqueArchs := lo.Uniq(allArchs)
			return uniqueArchs, nil
		}),
	})
}