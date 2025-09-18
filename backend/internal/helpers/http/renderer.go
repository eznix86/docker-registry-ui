package http

import (
	"encoding/json"
	std "net/http"

	inertia "github.com/romsar/gonertia/v2"
)

type ResponseType int

const (
	InertiaResponseType ResponseType = iota
	JsonResponseType
	InertiaRedirectType
)

type Response struct {
	Type       ResponseType
	Component  string                 // For Inertia responses
	Props      map[string]interface{} // For Inertia responses
	Data       interface{}            // For JSON responses
	StatusCode int                    // For JSON responses
	Path       string                 // For InertiaRedirect responses
}

func (r *Response) Render(vr *ViewRenderer, w std.ResponseWriter, req *std.Request) {
	switch r.Type {
	case InertiaResponseType:
		vr.ShowInertia(r, w, req)
	case JsonResponseType:
		vr.ShowJson(r, w, req)
	case InertiaRedirectType:
		vr.inertia.Redirect(w, req, r.Path)
	}
}

type ViewRenderer struct {
	inertia *inertia.Inertia
}

func NewViewRenderer(i *inertia.Inertia) *ViewRenderer {
	return &ViewRenderer{
		inertia: i,
	}
}

func (vr *ViewRenderer) ShowInertia(response *Response, w std.ResponseWriter, r *std.Request) {
	if response != nil {
		err := vr.inertia.Render(w, r, response.Component, response.Props)
		if err != nil {
			std.Error(w, err.Error(), std.StatusInternalServerError)
		}
	}
}

func (vr *ViewRenderer) ShowJson(response *Response, w std.ResponseWriter, r *std.Request) {
	if response != nil {
		w.Header().Set("Content-Type", "application/json")

		w.WriteHeader(response.StatusCode)

		json.NewEncoder(w).Encode(response.Data)
	}
}

func (vr *ViewRenderer) Render(handler func(std.ResponseWriter, *std.Request) *Response) std.HandlerFunc {
	return func(w std.ResponseWriter, r *std.Request) {
		response := handler(w, r)
		if response != nil {
			response.Render(vr, w, r)
		}
	}
}
