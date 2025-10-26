// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

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
