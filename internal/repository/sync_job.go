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
	"time"

	"github.com/eznix86/docker-registry-ui/internal/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type SyncJobRepository struct {
	db *gorm.DB
}

func NewSyncJobRepository(db *gorm.DB) *SyncJobRepository {
	return &SyncJobRepository{db: db}
}

// EnqueueJob creates a new job or updates existing one if it already exists (idempotent)
// Returns the job and a boolean indicating if it was newly created (true) or already existed (false)
func (r *SyncJobRepository) EnqueueJob(job *models.SyncJob) (bool, error) {
	// Set initial values
	now := time.Now()
	job.Status = models.JobStatusPending
	job.Attempts = 0
	job.CreatedAt = now
	job.UpdatedAt = now
	job.NextRetryAt = &now // Available immediately

	// Use UNIQUE constraint to prevent duplicates
	// If conflict occurs, do nothing (job already exists)
	result := r.db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "job_type"}, {Name: "registry_name"}, {Name: "repository"}, {Name: "tag_ref"}},
		DoNothing: true,
	}).Create(job)

	if result.Error != nil {
		return false, result.Error
	}

	// If RowsAffected == 0, job already existed
	created := result.RowsAffected > 0
	return created, nil
}

// DequeueJob atomically fetches the next available job and marks it as running
// Returns nil if no jobs are available
// Uses UPDATE-based claim for SQLite compatibility (no FOR UPDATE support)
func (r *SyncJobRepository) DequeueJob() (*models.SyncJob, error) {
	now := time.Now()
	startedAt := now

	// Atomically claim a job by updating its status first
	// Only one worker will successfully update the row
	result := r.db.Exec(`
		UPDATE sync_jobs
		SET
			status = ?,
			started_at = ?,
			updated_at = ?,
			attempts = attempts + 1
		WHERE id = (
			SELECT id FROM sync_jobs
			WHERE status = ? OR (status = ? AND next_retry_at <= ?)
			ORDER BY priority DESC, next_retry_at ASC, created_at ASC
			LIMIT 1
		)
	`, models.JobStatusRunning, startedAt, now,
		models.JobStatusPending, models.JobStatusFailed, now)

	if result.Error != nil {
		return nil, result.Error
	}

	// If no rows affected, no jobs were available
	if result.RowsAffected == 0 {
		return nil, nil
	}

	// Fetch the job we just claimed
	var job models.SyncJob
	if err := r.db.Where("status = ? AND started_at = ?", models.JobStatusRunning, startedAt).
		First(&job).Error; err != nil {
		return nil, err
	}

	return &job, nil
}

// CompleteJob marks a job as successfully completed
func (r *SyncJobRepository) CompleteJob(jobID uint) error {
	now := time.Now()
	completedAt := now

	return r.db.Model(&models.SyncJob{}).
		Where("id = ?", jobID).
		Updates(map[string]interface{}{
			"status":       models.JobStatusCompleted,
			"completed_at": completedAt,
			"updated_at":   now,
		}).Error
}

// FailJob marks a job as failed and schedules retry with exponential backoff
// If max attempts reached, keeps status as failed without scheduling retry
func (r *SyncJobRepository) FailJob(jobID uint, errorMsg string) error {
	var job models.SyncJob
	if err := r.db.First(&job, jobID).Error; err != nil {
		return err
	}

	now := time.Now()
	job.ErrorMessage = &errorMsg
	job.UpdatedAt = now

	// Check if we should retry
	if job.Attempts < job.MaxAttempts {
		// Calculate exponential backoff: 2^(attempts-1) seconds
		// attempts=1: 1s, attempts=2: 2s, attempts=3: 4s, attempts=4: 8s
		backoff := min(1<<(job.Attempts-1), 3600) // Cap at 1 hour

		nextRetry := now.Add(time.Duration(backoff) * time.Second)
		job.Status = models.JobStatusFailed
		job.NextRetryAt = &nextRetry
		job.BackoffSeconds = backoff
	} else {
		// Max attempts reached, mark as permanently failed
		job.Status = models.JobStatusFailed
		job.NextRetryAt = nil
	}

	return r.db.Save(&job).Error
}

// FindByID retrieves a job by its ID
func (r *SyncJobRepository) FindByID(id uint) (*models.SyncJob, error) {
	var job models.SyncJob
	if err := r.db.First(&job, id).Error; err != nil {
		return nil, err
	}
	return &job, nil
}

// FindPendingJobs returns all pending jobs (useful for monitoring)
func (r *SyncJobRepository) FindPendingJobs() ([]models.SyncJob, error) {
	var jobs []models.SyncJob
	if err := r.db.Where("status = ?", models.JobStatusPending).Find(&jobs).Error; err != nil {
		return nil, err
	}
	return jobs, nil
}

// FindFailedJobs returns all failed jobs (useful for debugging)
func (r *SyncJobRepository) FindFailedJobs() ([]models.SyncJob, error) {
	var jobs []models.SyncJob
	if err := r.db.Where("status = ? AND attempts >= max_attempts", models.JobStatusFailed).Find(&jobs).Error; err != nil {
		return nil, err
	}
	return jobs, nil
}

// CountByStatus returns count of jobs by status
func (r *SyncJobRepository) CountByStatus(status string) (int64, error) {
	var count int64
	if err := r.db.Model(&models.SyncJob{}).Where("status = ?", status).Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

// DeleteCompletedJobs removes completed jobs older than the specified duration
func (r *SyncJobRepository) DeleteCompletedJobs(olderThan time.Duration) error {
	cutoff := time.Now().Add(-olderThan)
	return r.db.Where("status = ? AND completed_at < ?", models.JobStatusCompleted, cutoff).
		Delete(&models.SyncJob{}).Error
}
