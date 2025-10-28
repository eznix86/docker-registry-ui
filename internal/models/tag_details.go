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

type TagDetails struct {
	ID               uint      `gorm:"primaryKey"`
	RepoID           uint      `gorm:"column:repo_id;not null"`
	Name             string    `gorm:"column:name;not null"`
	Digest           string    `gorm:"column:digest;not null"`
	EarliestCreated  string    `gorm:"column:earliest_created"`
	TotalSizeInBytes int64     `gorm:"column:total_size_in_bytes;default:0"`
	UpdatedAt        time.Time `gorm:"column:updated_at"`

	// Relationships for eager loading
	Manifest *Manifest `gorm:"foreignKey:Digest;references:Digest"`
}

func (TagDetails) TableName() string {
	return "tag_details"
}
