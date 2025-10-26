// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

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
