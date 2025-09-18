package models

type Image struct {
	ID         uint
	Repository Repository
	RepositoryID uint
	Digest     string
	OS         string
	Arch       string
	MediaType  string // Manifest media type for deletion
	Size       int64  // Image size in bytes
}
