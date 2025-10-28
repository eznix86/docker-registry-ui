// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025  Bruno Bernard
//
// This file is part of Docker Registry UI (Container Hub).
//
// Docker Registry UI is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
//
// Docker Registry UI is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.

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
