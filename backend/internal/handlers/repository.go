package handlers

import (
	"net/http"

	v "github.com/eznix86/docker-registry-ui/backend/internal/helpers/http"
)

func RepositoryHandler(w http.ResponseWriter, r *http.Request) *v.Response {
	return v.InertiaView("Repository", nil)
}