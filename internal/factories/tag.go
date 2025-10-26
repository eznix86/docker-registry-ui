// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

package factories

import (
	"fmt"

	fake "github.com/brianvoe/gofakeit/v7"
	"github.com/eznix86/docker-registry-ui/internal/models"
	"gorm.io/gorm"
)

type TagFactory struct {
	*Factory[models.Tag]
	usedNames map[string]bool
	counter   int
}

func NewTagFactory(db *gorm.DB) *TagFactory {
	tf := &TagFactory{
		usedNames: make(map[string]bool),
		counter:   0,
	}

	tf.Factory = NewFactory(db, func() *models.Tag {
		var name string
		maxAttempts := 100

		// Try to generate a unique name
		for attempt := 0; attempt < maxAttempts; attempt++ {
			tagTypes := []string{"semver", "named", "dated", "commit"}
			tagType := fake.RandomString(tagTypes)

			switch tagType {
			case "semver":
				name = fmt.Sprintf("v%d.%d.%d", fake.Number(0, 5), fake.Number(0, 20), fake.Number(0, 100))
			case "named":
				names := []string{
					"latest", "stable", "edge", "canary", "nightly",
					"alpine", "slim", "bullseye", "buster", "focal",
					"jammy", "bookworm", "lts", "dev", "prod",
				}
				baseName := fake.RandomString(names)
				// Use larger range for suffix
				suffix := fake.Number(1, 9999)
				name = fmt.Sprintf("%s-%d", baseName, suffix)
			case "dated":
				year := fake.Number(2020, 2025)
				month := fake.Number(1, 12)
				day := fake.Number(1, 28)
				hour := fake.Number(0, 23)
				minute := fake.Number(0, 59)
				name = fmt.Sprintf("%d%02d%02d-%02d%02d", year, month, day, hour, minute)
			case "commit":
				// Short git commit hash style with counter
				name = fmt.Sprintf("%s-%d", fake.LetterN(7), fake.Number(1, 9999))
			}

			// Check if name is unique
			if !tf.usedNames[name] {
				tf.usedNames[name] = true
				break
			}

			// If we've tried many times, fall back to counter-based naming
			if attempt == maxAttempts-1 {
				tf.counter++
				name = fmt.Sprintf("tag-%d", tf.counter)
				tf.usedNames[name] = true
			}
		}

		return &models.Tag{
			Name:   name,
			Digest: fmt.Sprintf("sha256:%s", fake.LetterN(64)),
		}
	})

	return tf
}

// WithRepository sets the repository ID for the tag
func (f *TagFactory) WithRepository(repoID uint) *TagFactory {
	f.overrides = append(f.overrides, func(tag *models.Tag) {
		tag.RepoID = repoID
	})
	return f
}

// WithDigest sets a custom digest for the tag
func (f *TagFactory) WithDigest(digest string) *TagFactory {
	f.overrides = append(f.overrides, func(tag *models.Tag) {
		tag.Digest = digest
	})
	return f
}
