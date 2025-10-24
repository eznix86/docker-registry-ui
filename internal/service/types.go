// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

package service

import "time"

type Registry struct {
	Name   string `json:"name"`
	Host   string `json:"host"`
	Status int    `json:"status"`
}

type Repository struct {
	ID            uint     `json:"id"`
	Name          string   `json:"name"`
	Registry      string   `json:"registry"`
	Namespace     *string  `json:"namespace"`
	Size          int64    `json:"totalSizeInBytes"`
	Architectures []string `json:"architectures"`
	TagsCount     int      `json:"tagsCount"`
}

type RepositoryFilterResult struct {
	Repositories []Repository
	Total        int64
}

type TagFilterParams struct {
	SortBy   string
	Search   string
	Page     int
	PageSize int
}

type Image struct {
	Digest       string    `json:"digest"`
	CreatedAt    time.Time `json:"createdAt"`
	OS           string    `json:"os"`
	Architecture string    `json:"architecture"`
	Variant      string    `json:"variant"`
	Size         int64     `json:"size"`
	LastUpdated  time.Time `json:"lastUpdated"`
}

type Tag struct {
	Name      string    `json:"name"`
	Digest    string    `json:"digest"`
	CreatedAt time.Time `json:"createdAt"`
	Images    []Image   `json:"images"`
	Alias     []string  `json:"aliases"`
}
