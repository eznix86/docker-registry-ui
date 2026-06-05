package web

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"

	clog "github.com/charmbracelet/log"
	"github.com/eznix86/docker-registry-ui/internal/helm"
	"github.com/eznix86/docker-registry-ui/internal/registry"
	"github.com/eznix86/docker-registry-ui/internal/store"
	"github.com/eznix86/docker-registry-ui/internal/sync"
	"github.com/eznix86/docker-registry-ui/internal/version"
	"github.com/go-chi/chi/v5"
)

const (
	jsonKeyError  = "error"
	jsonKeyStatus = "status"
)

type requestedTag struct {
	id     uint
	name   string
	digest string
}

type deleteTagsResponse struct {
	Deleted      int                 `json:"deleted"`
	Failed       int                 `json:"failed"`
	AliasDeleted map[string][]string `json:"aliasDeleted,omitempty"`
	Errors       map[string]string   `json:"errors,omitempty"`
}

func (h *handler) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{
		jsonKeyStatus: "ok",
		"version":     version.New().Short(),
	})
}

func (h *handler) manualSync(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	triggered := sync.TriggerManualSync(h.manualCh)

	status := http.StatusAccepted
	msg := map[string]string{jsonKeyStatus: "triggered", "message": "Manual sync started"}
	if !triggered {
		status = http.StatusConflict
		msg = map[string]string{jsonKeyStatus: "busy", "message": "Sync already running or pending"}
	}

	writeJSON(w, status, msg)
}

func (h *handler) deleteTags(w http.ResponseWriter, r *http.Request) {
	registryName := chi.URLParam(r, "registry")
	namespace := chi.URLParam(r, "namespace")
	repoName := chi.URLParam(r, "repository")
	repoName = decodeRepoName(repoName)
	registryHost := strings.ReplaceAll(registryName, "~", ":")
	ctx := r.Context()

	repo, err := h.store.GetRepositoryByPath(ctx, registryHost, namespace, repoName)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{jsonKeyError: "Repository not found"})
		return
	}

	var req struct {
		Tags []string `json:"tags"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || len(req.Tags) == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{jsonKeyError: "No tags specified"})
		return
	}

	client, err := h.regManager.GetClient(repo.Registry)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "Registry client not found"})
		return
	}

	repoFull := repo.Name
	if repo.Namespace != "" {
		repoFull = repo.Namespace + "/" + repo.Name
	}

	resp := deleteTagsResponse{
		Errors:       make(map[string]string),
		AliasDeleted: make(map[string][]string),
	}

	requestedTags, digests := h.resolveRequestedTags(ctx, repo.ID, req.Tags, &resp)

	if len(requestedTags) == 0 {
		writeJSON(w, http.StatusMultiStatus, resp)
		return
	}

	allTags, err := h.store.GetTagsByRepoAndDigests(ctx, repo.ID, digests)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to load tag aliases"})
		return
	}

	regErrors := deleteRegistryDigests(r.Context(), client, repoFull, digests, allTags)

	for _, rt := range requestedTags {
		if msg, ok := regErrors[rt.digest]; ok {
			resp.Failed++
			resp.Errors[rt.name] = "Registry deletion failed: " + msg
		}
	}

	digestNames := buildDigestNames(allTags)
	for _, rt := range requestedTags {
		names := digestNames[rt.digest]
		if len(names) <= 1 {
			continue
		}
		var aliases []string
		for _, n := range names {
			if n != rt.name {
				aliases = append(aliases, n)
			}
		}
		if len(aliases) > 0 {
			resp.AliasDeleted[rt.name] = aliases
		}
	}

	resp.Deleted = h.deleteStoredTags(ctx, allTags, regErrors)

	status := http.StatusOK
	if resp.Failed > 0 {
		status = http.StatusMultiStatus
	}
	writeJSON(w, status, resp)
}

func (h *handler) resolveRequestedTags(
	ctx context.Context,
	repoID uint,
	names []string,
	resp *deleteTagsResponse,
) ([]requestedTag, []string) {
	requestedTags := make([]requestedTag, 0, len(names))
	digests := make([]string, 0, len(names))
	digestSet := make(map[string]bool, len(names))

	for _, tagName := range names {
		tag, err := h.store.GetTagByRepoAndName(ctx, repoID, tagName)
		if err != nil {
			resp.Failed++
			resp.Errors[tagName] = "Tag not found"
			continue
		}

		requestedTags = append(requestedTags, requestedTag{
			id:     tag.ID,
			name:   tag.Name,
			digest: tag.Digest,
		})

		if digestSet[tag.Digest] {
			continue
		}

		digests = append(digests, tag.Digest)
		digestSet[tag.Digest] = true
	}

	return requestedTags, digests
}

func deleteRegistryDigests(
	ctx context.Context,
	client *registry.Client,
	repoFull string,
	digests []string,
	allTags []store.Tag,
) map[string]string {
	regErrors := make(map[string]string)

	for _, digest := range digests {
		accept := manifestAcceptType(digest, allTags)
		if err := client.DeleteManifest(ctx, repoFull, digest, accept); err != nil {
			if !strings.Contains(err.Error(), "404") && !strings.Contains(err.Error(), "MANIFEST_UNKNOWN") {
				regErrors[digest] = err.Error()
			}
		}
	}

	return regErrors
}

func manifestAcceptType(digest string, allTags []store.Tag) string {
	accept := registry.MediaTypeDockerManifestV2
	for _, tag := range allTags {
		if tag.Digest == digest && tag.MediaType != "" {
			return tag.MediaType
		}
	}

	return accept
}

func buildDigestNames(allTags []store.Tag) map[string][]string {
	digestNames := make(map[string][]string, len(allTags))
	for _, tag := range allTags {
		digestNames[tag.Digest] = append(digestNames[tag.Digest], tag.Name)
	}

	return digestNames
}

func (h *handler) deleteStoredTags(
	ctx context.Context,
	allTags []store.Tag,
	regErrors map[string]string,
) int {
	deleted := 0
	for _, tag := range allTags {
		if _, failed := regErrors[tag.Digest]; failed {
			continue
		}

		if err := h.store.DeleteTag(ctx, &store.Tag{ID: tag.ID}); err != nil {
			clog.Warn("Failed to delete tag from DB", "tagID", tag.ID, "error", err)
			continue
		}

		deleted++
	}

	return deleted
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		clog.Error("Failed to encode JSON response", "error", err)
	}
}

func (h *handler) helmValues(w http.ResponseWriter, r *http.Request) {
	chart, status, errMsg := h.resolveHelmChart(r)
	if errMsg != "" {
		writeJSON(w, status, map[string]string{"error": errMsg})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"content": chart.Values})
}

func (h *handler) helmFiles(w http.ResponseWriter, r *http.Request) {
	chart, status, errMsg := h.resolveHelmChart(r)
	if errMsg != "" {
		writeJSON(w, status, map[string]string{"error": errMsg})
		return
	}
	files := make([]map[string]string, 0, len(chart.Files))
	for _, f := range chart.Files {
		files = append(files, map[string]string{"path": f.Path, "content": f.Content})
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"files":     files,
		"chartYaml": chart.ChartYAML,
	})
}

func (h *handler) resolveHelmChart(r *http.Request) (*helm.Chart, int, string) {
	ctx := r.Context()
	registryName := strings.ReplaceAll(chi.URLParam(r, "registry"), "~", ":")
	repoName := decodeRepoName(chi.URLParam(r, "repository"))
	tagName := chi.URLParam(r, "tag")
	namespace := chi.URLParam(r, "namespace")

	repo, err := h.store.GetRepositoryByPath(ctx, registryName, namespace, repoName)
	if err != nil {
		return nil, http.StatusNotFound, "Repository not found"
	}

	tag, err := h.store.GetTagByRepoAndName(ctx, repo.ID, tagName)
	if err != nil {
		return nil, http.StatusNotFound, "Tag not found"
	}
	if tag.Kind != "helm" {
		return nil, http.StatusBadRequest, "Tag is not a Helm chart"
	}

	chart, err := h.loadHelmChart(ctx, repo.Registry, repo.Namespace, repo.Name, tagName)
	if err != nil {
		return h.handleHelmError(err)
	}
	return chart, http.StatusOK, ""
}

func (h *handler) loadHelmChart(ctx context.Context, registryName, namespace, name, tag string) (*helm.Chart, error) {
	if h.helmReader == nil {
		return nil, errors.New("helm reader not configured")
	}
	client, err := h.regManager.GetClient(registryName)
	if err != nil {
		return nil, fmt.Errorf("registry client: %w", err)
	}
	repoPath := name
	if namespace != "" {
		repoPath = namespace + "/" + name
	}
	return h.helmReader.Read(ctx, client, repoPath, tag)
}

func (h *handler) handleHelmError(err error) (*helm.Chart, int, string) {
	if errors.Is(err, helm.ErrNotHelmChart) {
		return nil, http.StatusBadRequest, "Tag is not a Helm chart"
	}
	clog.Error("helm chart load failed", "error", err)
	return nil, http.StatusBadGateway, "Failed to load chart from registry"
}
