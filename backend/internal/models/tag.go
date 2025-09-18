package models

import "gorm.io/gorm"

type Tag struct {
	ID      uint
	ImageID uint
	Image   Image
	Name string
}


func SyncTags(db *gorm.DB, repository Repository, images []string) {

	db.Transaction(func(tx *gorm.DB) error {
		for _, image := range images {
			tag := Tag{
				ImageID: repository.ID,
				Name:    image,
			}
			db.Where(Tag{ImageID: repository.ID, Name: image}).FirstOrCreate(&tag)
		}
		return nil
	})

}