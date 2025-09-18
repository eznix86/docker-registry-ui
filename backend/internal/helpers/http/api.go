package http

import (
	"net/http"
)

// JSONSuccess creates a successful JSON response (200 OK)
func JSONSuccess(data interface{}) *Response {
	return &Response{
		Type:       JsonResponseType,
		Data:       data,
		StatusCode: http.StatusOK,
	}
}
