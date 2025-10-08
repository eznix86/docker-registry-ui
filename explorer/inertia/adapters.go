package inertia

import (
	"github.com/eznix86/docker-registry-ui/explorer"
	"github.com/romsar/gonertia/v2"
)

func toExploreResponse(r *explorer.ExploreResponse) gonertia.Props {
	return gonertia.Props{
		"Registries": gonertia.DeferProp{
			Group: "",
			Value: r.Registries,
		},
		"Repositories": gonertia.DeferProp{
			Group: "",
			Value: r.Repositories,
		},
	}
}

func toDetailsResponse(_ *explorer.DetailsResponse) gonertia.Props {
	return gonertia.Props{}
}
