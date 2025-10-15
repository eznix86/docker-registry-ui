// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

package handlers

import (
	"github.com/eznix86/docker-registry-ui/internal/service"
	"github.com/romsar/gonertia/v2"
)

func NewHandler(i *gonertia.ViteInstance, services *service.Services) *Handler {
	return &Handler{
		inertia:  i,
		services: services,
	}
}

type Handler struct {
	inertia  *gonertia.ViteInstance
	services *service.Services
}
