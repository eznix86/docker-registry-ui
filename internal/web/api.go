package web

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	clog "github.com/charmbracelet/log"
	"github.com/eznix86/docker-registry-ui/internal/store"
	"github.com/eznix86/docker-registry-ui/internal/sync"
	"github.com/eznix86/docker-registry-ui/internal/version"
	"github.com/go-chi/chi/v5"
)

func (h *handler) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{
		"status":  "ok",
		"version": version.New().Short(),
	})
}

func (h *handler) manualSync(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	triggered := sync.TriggerManualSync(h.manualCh)

	status := http.StatusAccepted
	msg := map[string]string{"status": "triggered", "message": "Manual sync started"}
	if !triggered {
		status = http.StatusConflict
		msg = map[string]string{"status": "busy", "message": "Sync already running or pending"}
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
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "Repository not found"})
		return
	}

	var req struct {
		Tags []string `json:"tags"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || len(req.Tags) == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "No tags specified"})
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

	type response struct {
		Deleted      int                 `json:"deleted"`
		Failed       int                 `json:"failed"`
		AliasDeleted map[string][]string `json:"aliasDeleted,omitempty"`
		Errors       map[string]string   `json:"errors,omitempty"`
	}

	resp := response{
		Errors:       make(map[string]string),
		AliasDeleted: make(map[string][]string),
	}

	// Collect requested tags and their digests.
	var requestedTags []struct {
		id     uint
		name   string
		digest string
	}
	var digests []string
	digestSet := make(map[string]bool)

	for _, tagName := range req.Tags {
		tag, err := h.store.GetTagByRepoAndName(ctx, repo.ID, tagName)
		if err != nil {
			resp.Failed++
			resp.Errors[tagName] = "Tag not found"
			continue
		}
		requestedTags = append(requestedTags, struct {
			id     uint
			name   string
			digest string
		}{tag.ID, tag.Name, tag.Digest})
		if !digestSet[tag.Digest] {
			digests = append(digests, tag.Digest)
			digestSet[tag.Digest] = true
		}
	}

	if len(requestedTags) == 0 {
		writeJSON(w, http.StatusMultiStatus, resp)
		return
	}

	// Find all tags sharing these digests (aliases).
	allTags, _ := h.store.GetTagsByRepoAndDigests(ctx, repo.ID, digests)

	// Delete from registry.
	regErrors := make(map[string]string)
	for _, d := range digests {
		accept := "application/vnd.docker.distribution.manifest.v2+json"
		for _, t := range allTags {
			if t.Digest == d && t.MediaType != "" {
				accept = t.MediaType
				break
			}
		}
		if err := client.DeleteManifest(r.Context(), repoFull, d, accept); err != nil {
			if !strings.Contains(err.Error(), "404") && !strings.Contains(err.Error(), "MANIFEST_UNKNOWN") {
				regErrors[d] = err.Error()
			}
		}
	}

	// Record registry errors.
	for _, rt := range requestedTags {
		if msg, ok := regErrors[rt.digest]; ok {
			resp.Failed++
			resp.Errors[rt.name] = fmt.Sprintf("Registry deletion failed: %s", msg)
		}
	}

	// Find alias info.
	digestNames := make(map[string][]string)
	for _, t := range allTags {
		digestNames[t.Digest] = append(digestNames[t.Digest], t.Name)
	}
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

	// Delete from DB (skip those with registry errors).
	successful := make([]uint, 0)
	for _, t := range allTags {
		if _, failed := regErrors[t.Digest]; failed {
			continue
		}
		successful = append(successful, t.ID)
	}
	for _, id := range successful {
		if err := h.store.DeleteTag(ctx, &store.Tag{ID: id}); err != nil {
			clog.Warn("Failed to delete tag from DB", "tagID", id, "error", err)
		}
	}
	resp.Deleted = len(successful)

	status := http.StatusOK
	if resp.Failed > 0 {
		status = http.StatusMultiStatus
	}
	writeJSON(w, status, resp)
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		clog.Error("Failed to encode JSON response", "error", err)
	}
}
