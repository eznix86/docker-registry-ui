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

package repository

import (
	"gorm.io/gorm"
)

type PaginationParams struct {
	Page     int
	PageSize int
}

type PaginatedResult struct {
	Data         interface{}
	CurrentPage  int
	NextPage     *int
	PreviousPage *int
	TotalPages   int
	TotalCount   int64
}

func Paginate(params PaginationParams) func(db *gorm.DB) *gorm.DB {
	return func(db *gorm.DB) *gorm.DB {
		page := params.Page
		if page <= 0 {
			page = 1
		}

		pageSize := params.PageSize
		if pageSize <= 0 {
			// Allow callers to skip pagination by providing a non-positive
			// page size. This keeps existing behavior for zero/negative values
			// but ensures we do not add LIMIT/OFFSET in that case.
			return db
		}

		offset := (page - 1) * pageSize
		return db.Offset(offset).Limit(pageSize)
	}
}

func CalculatePaginationMetadata(currentPage, pageSize int, totalCount int64) (nextPage *int, previousPage *int, totalPages int) {
	if pageSize <= 0 {
		pageSize = 20
	}

	if currentPage <= 0 {
		currentPage = 1
	}

	totalPages = int((totalCount + int64(pageSize) - 1) / int64(pageSize))

	if currentPage > 1 {
		prev := currentPage - 1
		previousPage = &prev
	}

	if currentPage < totalPages {
		next := currentPage + 1
		nextPage = &next
	}

	return
}
