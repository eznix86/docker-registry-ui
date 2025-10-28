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

type Registry struct {
	ID     uint   `gorm:"primaryKey"`                            // explicit PK
	Name   string `gorm:"column:name;type:text;not null;unique"` // match your migration
	Host   string `gorm:"column:host;type:text;not null;unique"` // host or host:port
	Status int    `gorm:"column:last_status"`                    // maps to last_status
}

func (Registry) TableName() string {
	return "registries"
}
