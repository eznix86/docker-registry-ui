// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

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
