package handlers

import (
	"net/http"
	"time"

	httpHelper "github.com/eznix86/docker-registry-ui/backend/internal/helpers/http"
	"github.com/eznix86/docker-registry-ui/backend/internal/presenters"
)

func HealthHandler(w http.ResponseWriter, r *http.Request) *httpHelper.Response {
	
	response := presenters.HealthView{
		Status: "ok",
		Time:   time.Now().Format(time.RFC3339),
	}

	return httpHelper.JSONSuccess(response)
}