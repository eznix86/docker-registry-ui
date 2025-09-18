package handlers

import (
	"net/http"

	"github.com/eznix86/docker-registry-ui/backend/internal/app"
	v "github.com/eznix86/docker-registry-ui/backend/internal/helpers/http"
)

func RefreshHandler(w http.ResponseWriter, r *http.Request) *v.Response {

	app.Dispatcher().Dispatch(func() {
		app.FullSync().SyncAllRegistries()
		app.FullSync().ResolveHealth()
		app.FullSync().SyncRepositories()
		app.FullSync().SyncTags()
	})

	return v.InertiaRedirect(r.Referer())
}