package models

import (
	"database/sql/driver"
	"encoding/json"
	"strings"

	"github.com/eznix86/docker-registry-ui/backend/internal/presenters"
	"github.com/eznix86/docker-registry-ui/backend/internal/utils"
	"gorm.io/gorm"
)

// StringArray is a custom type for storing JSON string arrays in database

type StringArray []string

func (sa StringArray) Value() (driver.Value, error) {
	return json.Marshal(sa)
}

func (sa *StringArray) Scan(value interface{}) error {
	if value == nil {
		*sa = StringArray{}
		return nil
	}

	switch v := value.(type) {
	case []byte:
		return json.Unmarshal(v, sa)
	case string:
		return json.Unmarshal([]byte(v), sa)
	}
	return nil
}

type Repository struct {
	ID         uint    
	Namespace  *string
	Name       string
	FullName   string

	// Denormalized fields for UI performance
	TotalTags     int         `json:"total_tags" gorm:"default:0"`
	TotalSize     int64       `json:"total_size" gorm:"default:0"`    // Total size in bytes
	TagsList      StringArray `json:"tags_list" gorm:"type:text"`     // JSON array of tag names
	Architectures StringArray `json:"architectures" gorm:"type:text"` // JSON array of unique architectures

	RegistryID uint
	Registry Registry
}

// ToPresenter converts Repository to RepositoryView for API responses
func (r *Repository) ToPresenter() *presenters.RepositoryView {
	return &presenters.RepositoryView{
		ID:                 r.ID,
		Name:               r.Name,
		Namespace:          r.Namespace,
		FullName:           r.FullName,
		Source:             r.Registry.Name,
		TagCount:           r.TotalTags,
		TotalSize:          r.TotalSize,
		TotalSizeFormatted: utils.FormatBytes(r.TotalSize),
		TagsList:           []string(r.TagsList),
		Architectures:      []string(r.Architectures),
		RegistryHost:       r.Registry.Host,
	}
}

func SyncRepositories(db *gorm.DB, registry Registry, repositories []string) {
	db.Transaction(func(tx *gorm.DB) error {
		for _, repository := range repositories {

			split := strings.Split(repository, "/")

			namespace := ""
			name := split[0]

			if len(split) > 2 {
				namespace = split[0]
				name = split[1]
			}
			
			repository := Repository{
				Name:        name,
				Namespace: 	 &namespace,
				FullName:    repository,
				TotalTags:   0,
				TotalSize:   0,
				TagsList:    StringArray{},
				Architectures: StringArray{},
				RegistryID:  registry.ID,
				Registry:    registry,
			}
			db.Where(Repository{FullName: repository.FullName, RegistryID: registry.ID}).FirstOrCreate(&repository)
		}
		return nil
	})
}