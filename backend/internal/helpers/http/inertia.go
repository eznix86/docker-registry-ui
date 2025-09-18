package http

import (
	inertia "github.com/romsar/gonertia/v2"
)

// InertiaView creates a ViewResponse that can be returned from handlers
func InertiaView(name string, props inertia.Props) *Response {
	return &Response{
		Type:      InertiaResponseType,
		Component: name,
		Props:     props,
	}
}

// InertiaRedirect creates a Response that can be returned from handlers
// to redirect to another Inertia route.
func InertiaRedirect(path string) *Response {
	return &Response{
		Type:      InertiaRedirectType,
		Path:      path,
	}
}