// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

package handlers

import "github.com/eznix86/docker-registry-ui/pkg/inertia"

func NewHandler(i *inertia.ViteInstance) *handler {
	return &handler{
		inertia: i,
	}
}

type handler struct {
	inertia *inertia.ViteInstance
}
