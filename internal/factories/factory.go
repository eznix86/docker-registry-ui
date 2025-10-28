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

package factories

import (
	"gorm.io/gorm"
)

type Factory[T any] struct {
	db        *gorm.DB
	count     int
	make      func() *T
	overrides []func(*T)
}

func NewFactory[T any](db *gorm.DB, makeFunc func() *T) *Factory[T] {
	return &Factory[T]{
		db:        db,
		count:     1,
		make:      makeFunc,
		overrides: []func(*T){},
	}
}

func (f *Factory[T]) Count(n int) *Factory[T] {
	f.count = n
	return f
}

func (f *Factory[T]) Make() []*T {
	var models []*T
	for i := 0; i < f.count; i++ {
		model := f.make()
		for _, override := range f.overrides {
			override(model)
		}
		models = append(models, model)
	}
	return models
}

func (f *Factory[T]) Create() ([]*T, error) {
	instances := f.Make()
	for _, model := range instances {
		if err := f.db.Create(model).Error; err != nil {
			return nil, err
		}
	}
	return instances, nil
}

// CreateWithoutHooks creates instances without triggering GORM hooks (useful for bulk inserts/seeding)
func (f *Factory[T]) CreateWithoutHooks() ([]*T, error) {
	instances := f.Make()
	for _, model := range instances {
		if err := f.db.Session(&gorm.Session{SkipHooks: true}).Create(model).Error; err != nil {
			return nil, err
		}
	}
	return instances, nil
}
