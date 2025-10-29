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

package models

import "time"

// Job types for sync operations
const (
	JobTypeSyncCatalog  = "sync_catalog"
	JobTypeSyncTags     = "sync_tags"
	JobTypeSyncManifest = "sync_manifest"
)

// Job status states
const (
	JobStatusPending   = "pending"
	JobStatusRunning   = "running"
	JobStatusCompleted = "completed"
	JobStatusFailed    = "failed"
)

// SyncJob represents a background synchronization job for registry data
type SyncJob struct {
	ID uint `gorm:"primaryKey"`

	// Job identification
	JobType      string  `gorm:"column:job_type;type:text;not null"`
	RegistryName string  `gorm:"column:registry_name;type:text;not null"`
	RegistryURL  string  `gorm:"column:registry_url;type:text;not null"`
	Repository   *string `gorm:"column:repository;type:text"`
	TagRef       *string `gorm:"column:tag_ref;type:text"`

	// State management
	Status   string `gorm:"column:status;type:text;not null;default:pending"`
	Priority int    `gorm:"column:priority;default:0"`

	// Retry logic
	Attempts       int        `gorm:"column:attempts;default:0"`
	MaxAttempts    int        `gorm:"column:max_attempts;default:3"`
	NextRetryAt    *time.Time `gorm:"column:next_retry_at"`
	BackoffSeconds int        `gorm:"column:backoff_seconds;default:1"`

	// Error tracking
	ErrorMessage *string `gorm:"column:error_message;type:text"`

	// Timestamps
	CreatedAt   time.Time  `gorm:"column:created_at;default:CURRENT_TIMESTAMP"`
	UpdatedAt   time.Time  `gorm:"column:updated_at;default:CURRENT_TIMESTAMP"`
	StartedAt   *time.Time `gorm:"column:started_at"`
	CompletedAt *time.Time `gorm:"column:completed_at"`
}

func (SyncJob) TableName() string {
	return "sync_jobs"
}
