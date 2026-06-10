package web

import (
	"net/http"
	"net/url"
	"strings"

	"github.com/eznix86/docker-registry-ui/internal/helm"
	"github.com/eznix86/docker-registry-ui/internal/progress"
	"github.com/eznix86/docker-registry-ui/internal/registry"
	"github.com/eznix86/docker-registry-ui/internal/store"
	"github.com/eznix86/docker-registry-ui/internal/sync"
	"github.com/go-chi/chi/v5"
	"github.com/romsar/gonertia/v3"
)

type handler struct {
	inertia      *gonertia.ViteInstance
	store        *store.Store
	regManager   *registry.Manager
	helmReader   *helm.Reader
	broadcaster  *progress.WebSocketBroadcaster
	manualCh     sync.ManualSyncChannel
	authHandler  *AuthHandler
	showUsageBar bool
}

func (h *handler) renderPage(w http.ResponseWriter, r *http.Request, page string, props gonertia.Props) error {
	if user, ok := UserFromContext(r.Context()); ok {
		props["auth"] = gonertia.Props{"user": user}
	}
	return h.inertia.Render(w, r, page, props)
}

func (h *handler) explore(w http.ResponseWriter, r *http.Request) {
	filters := parseExploreFilters(r)

	ctx := r.Context()
	repos, err := h.store.GetRepositoriesViewFiltered(ctx, filters)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	registries, err := h.store.GetAllRegistries(ctx)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	archs, err := h.store.GetUniqueArchitectures(ctx)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	total, err := h.store.GetTotalRepositoriesCount(ctx)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	props := gonertia.Props{
		"repositories":      repos,
		"registries":        toRegistryOptions(registries),
		"totalRepositories": total,
		"architectures":     archs,
		"filters":           exploreProps(filters),
	}

	if h.showUsageBar {
		storageByRegistry, err := h.store.GetStorageUsageByRegistry(ctx)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		props["charts"] = gonertia.Props{"storageByRegistry": storageByRegistry}
	}

	if err := h.renderPage(w, r, "Explore", props); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func (h *handler) registryPage(w http.ResponseWriter, r *http.Request) {
	host := chi.URLParam(r, "registry")
	host = strings.ReplaceAll(host, "~", ":")
	ctx := r.Context()

	reg, err := h.store.GetRegistryByHost(ctx, host)
	if err != nil {
		http.Error(w, "registry not found", http.StatusNotFound)
		return
	}

	registries, err := h.store.GetAllRegistries(ctx)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	stats, err := h.store.GetRegistryStats(ctx, host)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	storageByNS, err := h.store.GetRegistryStorageByNamespace(ctx, host)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	archCoverage, err := h.store.GetRegistryArchitectureCoverage(ctx, host)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	repoList, err := h.store.GetRegistryRepositories(ctx, host)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	props := gonertia.Props{
		"registry": gonertia.Props{
			"name":        reg.Name,
			"host":        reg.Host,
			jsonKeyStatus: reg.Status,
		},
		"registries":   toRegistryOptions(registries),
		"stats":        stats,
		"charts":       gonertia.Props{"storageByNamespace": storageByNS, "architectureCoverage": archCoverage},
		"repositories": repoList,
	}

	if err := h.renderPage(w, r, "Registry", props); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func (h *handler) repositoryPage(w http.ResponseWriter, r *http.Request) {
	registryHost := chi.URLParam(r, "registry")
	registryHost = strings.ReplaceAll(registryHost, "~", ":")
	namespace := chi.URLParam(r, "namespace")
	repoName := chi.URLParam(r, "repository")
	repoName = decodeRepoName(repoName)
	ctx := r.Context()

	repo, err := h.store.GetRepositoryByPath(ctx, registryHost, namespace, repoName)
	if err != nil {
		http.Error(w, "repository not found", http.StatusNotFound)
		return
	}

	tagFilter := parseTagFilter(r)
	pagination := parseScroll(r, 5)

	result, err := h.store.GetTagsForRepository(ctx, repo.ID, tagFilter, pagination)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	props := gonertia.Props{
		"repository": repo,
		"tags": gonertia.Scroll(
			result.Tags,
			gonertia.WithMetadata(gonertia.ScrollMetadata{
				PageName:     "page",
				CurrentPage:  result.CurrentPage,
				NextPage:     result.NextPage,
				PreviousPage: result.PreviousPage,
			}),
		),
		"filters": gonertia.Props{"sortBy": tagFilter.SortBy, "filter": tagFilter.Name},
		"bulkDeleteTags": gonertia.Optional(func() (any, error) {
			if repo.TagsCount == 0 {
				return []store.TagView{}, nil
			}
			r, err := h.store.GetTagsForRepository(ctx, repo.ID, tagFilter, store.ScrollPagination{Page: 1, PageSize: repo.TagsCount})
			if err != nil {
				return nil, err
			}
			return r.Tags, nil
		}),
	}

	if err := h.renderPage(w, r, "Repository", props); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func (h *handler) notFound(w http.ResponseWriter, r *http.Request) {
	if err := h.renderPage(w, r, "NotFound", gonertia.Props{}); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func decodeRepoName(name string) string {
	if decoded, err := url.QueryUnescape(name); err == nil {
		return decoded
	}
	return name
}
