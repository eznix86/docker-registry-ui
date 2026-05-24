package store

import "time"

type Registry struct {
	ID         uint       `json:"id"`
	Name       string     `json:"name"`
	Host       string     `json:"host"`
	URL        string     `json:"url"`
	Status     int        `json:"status"`
	LastSyncAt *time.Time `json:"lastSyncAt"`
}

type Repository struct {
	ID         uint       `json:"id"`
	RegistryID uint       `json:"registryId"`
	Namespace  string     `json:"namespace"`
	Name       string     `json:"name"`
	LastSyncAt *time.Time `json:"lastSyncAt"`
}

type Tag struct {
	ID           uint       `json:"id"`
	RepositoryID uint       `json:"repositoryId"`
	Name         string     `json:"name"`
	Digest       string     `json:"digest"`
	Kind         string     `json:"kind"`
	MediaType    string     `json:"mediaType"`
	LastSyncAt   *time.Time `json:"lastSyncAt"`
	NextCheckAt  *time.Time `json:"nextCheckAt"`
	Priority     float64    `json:"priority"`
	SyncStatus   string     `json:"syncStatus"`
	LastError    string     `json:"lastError"`
}

type Manifest struct {
	Digest       string     `json:"digest"`
	MediaType    string     `json:"mediaType"`
	Kind         string     `json:"kind"`
	RawJSON      string     `json:"rawJson"`
	ConfigDigest string     `json:"configDigest"`
	OS           string     `json:"os"`
	Architecture string     `json:"architecture"`
	Variant      string     `json:"variant"`
	SizeBytes    int64      `json:"sizeBytes"`
	Created      *time.Time `json:"created"`
	SeenAt       *time.Time `json:"seenAt"`
}

type ManifestPlatform struct {
	IndexDigest    string `json:"indexDigest"`
	PlatformDigest string `json:"platformDigest"`
	OS             string `json:"os"`
	Architecture   string `json:"architecture"`
	Variant        string `json:"variant"`
	Position       int    `json:"position"`
	SizeBytes      int64  `json:"sizeBytes"`
}

type ConfigBlob struct {
	Digest       string     `json:"digest"`
	SizeBytes    int64      `json:"sizeBytes"`
	Created      *time.Time `json:"created"`
	ConfigJSON   string     `json:"configJson"`
	OS           string     `json:"os"`
	Architecture string     `json:"architecture"`
	SeenAt       *time.Time `json:"seenAt"`
}

type Layer struct {
	Digest    string `json:"digest"`
	SizeBytes int64  `json:"sizeBytes"`
	MediaType string `json:"mediaType"`
}

type ManifestLayer struct {
	ManifestDigest string `json:"manifestDigest"`
	LayerDigest    string `json:"layerDigest"`
	Position       int    `json:"position"`
}

// View types for page rendering.

type RepositoryView struct {
	ID               uint     `json:"id"`
	Name             string   `json:"name"`
	Namespace        string   `json:"namespace"`
	Registry         string   `json:"registry"`
	RegistryHost     string   `json:"registryHost"`
	TagsCount        int      `json:"tagsCount"`
	Architectures    []string `json:"architectures"`
	TotalSizeInBytes int64    `json:"totalSizeInBytes"`
}

type TagView struct {
	ID                uint        `json:"id"`
	Name              string      `json:"name"`
	Digest            string      `json:"digest"`
	Kind              string      `json:"kind"`
	CreatedAt         time.Time   `json:"createdAt"`
	Images            []ImageView `json:"images"`
	Alias             []string    `json:"alias"`
	MetadataAvailable bool        `json:"metadataAvailable"`
	ChartName         string      `json:"chartName"`
	ChartVersion      string      `json:"chartVersion"`
	ChartDesc         string      `json:"chartDesc"`
}

type ImageView struct {
	Digest       string    `json:"digest"`
	CreatedAt    time.Time `json:"createdAt"`
	OS           string    `json:"os"`
	Architecture string    `json:"architecture"`
	Variant      string    `json:"variant"`
	Size         int64     `json:"size"`
	Stub         bool      `json:"stub"`
}

type RegistryStatsView struct {
	RepositoryCount       int   `json:"repositoryCount"`
	TagCount              int   `json:"tagCount"`
	EstimatedStorageBytes int64 `json:"estimatedStorageBytes"`
	ArchitectureCount     int   `json:"architectureCount"`
}

type NamespaceStorageView struct {
	Namespace      string `json:"namespace"`
	DisplayName    string `json:"displayName"`
	TotalSizeBytes int64  `json:"totalSizeBytes"`
}

type ArchitectureCoverageView struct {
	Architecture    string `json:"architecture"`
	RepositoryCount int    `json:"repositoryCount"`
}

type RegistryRepositoryRow struct {
	ID               uint   `json:"id"`
	Name             string `json:"name"`
	Namespace        string `json:"namespace"`
	DisplayName      string `json:"displayName"`
	TagsCount        int    `json:"tagsCount"`
	TotalSizeInBytes int64  `json:"totalSizeInBytes"`
}

type RegistryStorageUsageView struct {
	RegistryHost    string `json:"registryHost"`
	DisplayName     string `json:"displayName"`
	TotalSizeBytes  int64  `json:"totalSizeBytes"`
}

// Filter and pagination types.

type RepositoryFilters struct {
	Registries    []string
	Architectures []string
	Search        string
	ShowUntagged  bool
}

type TagFilter struct {
	SortBy string
	Name   string
}

type ScrollPagination struct {
	Page     int
	PageSize int
}

type ScrollResult struct {
	Tags         []TagView
	TotalCount   int
	CurrentPage  int
	NextPage     *int
	PreviousPage *int
}
