// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

package data

type RegistryModel struct{}

type Registry struct {
	Name   string `json:"name"`
	Host   string `json:"host"`
	Status int    `json:"status"`
}

func (r *RegistryModel) GetAll() []Registry {
	return []Registry{
		{
			Name:   "docker.io",
			Host:   "registry-1.docker.io",
			Status: 200,
		},
		{
			Name:   "localhost:5000",
			Host:   "localhost:5000",
			Status: 200,
		},
		{
			Name:   "ghcr.io",
			Host:   "ghcr.io",
			Status: 403,
		},
	}
}
