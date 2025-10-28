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

import "gorm.io/gorm"

type Tag struct {
	ID     uint   `gorm:"primaryKey"`
	RepoID uint   `gorm:"column:repo_id;not null;index"`
	Name   string `gorm:"column:name;type:text;not null"`
	Digest string `gorm:"column:digest;type:text;not null"`

	Repository *Repository `gorm:"foreignKey:RepoID;references:ID"`
	Manifest   *Manifest   `gorm:"foreignKey:Digest;references:Digest"`
}

func (Tag) TableName() string {
	return "tags"
}

// AfterCreate marks the tag and its repository as dirty after creation
func (t *Tag) AfterCreate(tx *gorm.DB) error {
	return markTagDirty(tx, t.ID, t.RepoID)
}

// AfterUpdate marks the tag and its repository as dirty after update
func (t *Tag) AfterUpdate(tx *gorm.DB) error {
	return markTagDirty(tx, t.ID, t.RepoID)
}

// BeforeDelete marks the repository as dirty before tag deletion
// Use BeforeDelete (not AfterDelete) to ensure RepoID is still accessible
func (t *Tag) BeforeDelete(tx *gorm.DB) error {
	return tx.Exec("INSERT OR IGNORE INTO dirty_repos(repo_id) VALUES (?)", t.RepoID).Error
}

// markTagDirty is a helper function to mark both tag and repo as dirty
func markTagDirty(tx *gorm.DB, tagID, repoID uint) error {
	// Mark tag as dirty
	if err := tx.Exec("INSERT OR IGNORE INTO dirty_tags(tag_id) VALUES (?)", tagID).Error; err != nil {
		return err
	}
	// Mark repo as dirty
	return tx.Exec("INSERT OR IGNORE INTO dirty_repos(repo_id) VALUES (?)", repoID).Error
}
