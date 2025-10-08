package explorer

import (
	"context"
)

type ExploreRequest struct {
	Architecture string
	Query        string
	Tags         []string
	Untagged     bool
}

type ExploreResponse struct {
	Registries   []Registry
	Repositories []Repository
}

type Registry struct {
	Name   string
	Status string
}

type Repository struct {
	Name          string
	Registry      string
	Size          int
	Architectures []string
	CrawlState    string
	LastSyncedAt  string
}

type DetailsResponse struct{}

type Explorer interface {
	Explore(ctx context.Context, req ExploreRequest) (*ExploreResponse, error)
	Details(ctx context.Context, registry, image string) (*DetailsResponse, error)
}
