package sync

import (
	"context"
	"errors"
	"fmt"
	stdsync "sync"
	"time"

	clog "github.com/charmbracelet/log"
	"github.com/eznix86/docker-registry-ui/internal/registry"
	registryclient "github.com/eznix86/registry-client"

	gojson "github.com/eznix86/registry-client/jsoncompat"
	"golang.org/x/sync/errgroup"
)

// fetcher handles rate-limited HTTP calls to the registry.
type fetcher struct {
	limiter   *limiter
	manifests *lruCache[*registryclient.ManifestResponse]
	configs   *lruCache[*cachedBlob]
}

type cachedBlob struct {
	blob *registry.ConfigBlob
	json string
}

func newFetcher(l *limiter) *fetcher {
	return &fetcher{
		limiter:   l,
		manifests: newLRU[*registryclient.ManifestResponse](2000),
		configs:   newLRU[*cachedBlob](5000),
	}
}

func (f *fetcher) fetchDigest(ctx context.Context, client *registry.Client, repo, tag, regName string) (string, error) {
	release, err := f.limiter.acquire(ctx, regName)
	if err != nil {
		f.limiter.markFailure(regName)
		return "", err
	}
	defer release()
	resp, err := client.HeadManifest(ctx, repo, tag)
	if err != nil {
		f.limiter.markFailure(regName)
		return "", err
	}
	f.limiter.resetFailures(regName)
	if !resp.Exists {
		return "", errors.New("manifest not found")
	}
	if resp.Digest == "" {
		return "", errors.New("no digest in HEAD response")
	}
	return resp.Digest, nil
}

func (f *fetcher) fetchManifest(ctx context.Context, client *registry.Client, repo, tag, regName string) (*registryclient.ManifestResponse, error) {
	release, err := f.limiter.acquire(ctx, regName)
	if err != nil {
		f.limiter.markFailure(regName)
		return nil, err
	}
	defer release()
	resp, err := client.GetManifest(ctx, repo, tag)
	if err != nil {
		f.limiter.markFailure(regName)
		return nil, err
	}
	f.limiter.resetFailures(regName)
	return resp, nil
}

// ManifestGraph is the parsed manifest ready for persistence.
// It handles both single images and multi-arch indexes uniformly:
// for single images → one PlatformEntry; for indexes → multiple PlatformEntries.
type ManifestGraph struct {
	Digest    string
	Raw       []byte
	MediaType string
	Kind      ManifestKind
	Platforms []PlatformEntry
}

// PlatformEntry holds data for a single platform within a manifest.
type PlatformEntry struct {
	Digest        string
	Raw           []byte
	MediaType     string
	OS            string
	Architecture  string
	Variant       string
	Position      int
	Size          int64 // config + layers
	ConfigDigest  string
	ConfigSize    int64
	ConfigRaw     []byte
	ConfigOS      string
	ConfigArch    string
	ConfigCreated *time.Time
	Layers        []layerEntry

	// Helm chart metadata (populated when KindHelm).
	ChartName    string
	ChartVersion string
	ChartDesc    string
}

type layerEntry struct {
	Digest    string
	Size      int64
	MediaType string
}

// buildManifestGraph parses the raw manifest and fetches child manifests + config blobs
// to produce a complete ManifestGraph ready for persistence.
func buildManifestGraph(
	ctx context.Context,
	manifestResp *registryclient.ManifestResponse,
	client *registry.Client,
	f *fetcher,
	repoPath, regName, label string,
) (*ManifestGraph, error) {
	kind := KindImage
	if isManifestList(manifestResp.MediaType) {
		kind = KindIndex
	}

	g := &ManifestGraph{
		Digest:    manifestResp.Digest,
		Raw:       manifestResp.RawContent,
		MediaType: manifestResp.MediaType,
		Kind:      kind,
	}

	if kind == KindIndex {
		if err := g.buildIndex(ctx, client, f, repoPath, regName, label); err != nil {
			return nil, err
		}
	} else {
		if err := g.buildSingle(ctx, client, f, repoPath, regName); err != nil {
			return nil, err
		}
	}

	return g, nil
}

func (g *ManifestGraph) buildSingle(ctx context.Context, client *registry.Client, f *fetcher, repoPath, regName string) error {
	parsed, err := parseSingleManifest(g.Raw)
	if err != nil {
		return fmt.Errorf("parse single manifest %s: %w", g.Digest, err)
	}

	if isHelmConfig(parsed.Config.MediaType) {
		g.Kind = KindHelm
	}

	entry := PlatformEntry{
		Digest:    g.Digest,
		Raw:       g.Raw,
		MediaType: g.MediaType,
		Position:  0,
	}

	if parsed.Config.Digest != "" {
		entry.ConfigDigest = parsed.Config.Digest
		entry.ConfigSize = int64(parsed.Config.Size)
		entry.Size += entry.ConfigSize

		blob, _, err := f.fetchConfigBlob(ctx, client, repoPath, parsed.Config.Digest, regName)
		if err != nil {
			clog.Warn("Failed to fetch config blob", "digest", parsed.Config.Digest, "tag", g.Digest, "error", err)
		}
		if blob != nil {
			entry.ConfigRaw = []byte(blob.json)
			if g.Kind == KindHelm {
				if hc, err := parseHelmConfig([]byte(blob.json)); err == nil {
					entry.ChartName = hc.Name
					entry.ChartVersion = hc.Version
					entry.ChartDesc = hc.Description
				}
				if created, ok := parsed.Annotations["org.opencontainers.image.created"]; ok {
					if t, err := parseCreatedTime(created); err == nil {
						entry.ConfigCreated = &t
					}
				}
			} else {
				entry.ConfigOS = blob.blob.OS
				entry.ConfigArch = blob.blob.Architecture
				if blob.blob.Created != "" {
					if t, err := parseCreatedTime(blob.blob.Created); err == nil {
						entry.ConfigCreated = &t
					}
				}
			}
		}
		if g.Kind != KindHelm {
			entry.OS = entry.ConfigOS
			entry.Architecture = entry.ConfigArch
		}
	}

	for _, l := range parsed.Layers {
		entry.Layers = append(entry.Layers, layerEntry{
			Digest: l.Digest, Size: int64(l.Size), MediaType: l.MediaType,
		})
		entry.Size += int64(l.Size)
	}

	g.Platforms = append(g.Platforms, entry)
	return nil
}

func (g *ManifestGraph) buildIndex(
	ctx context.Context,
	client *registry.Client,
	f *fetcher,
	repoPath, regName, label string,
) error {
	ml, err := parseManifestList(g.Raw)
	if err != nil {
		return err
	}

	type idxEntry struct {
		pos   int
		entry manifestListEntry
	}

	var entries []idxEntry
	for pos, entry := range ml.Manifests {
		if isAttestation(&entry) {
			continue
		}
		entries = append(entries, idxEntry{pos, entry})
	}

	if len(entries) == 0 {
		return nil
	}

	platformMap := make(map[int]*PlatformEntry, len(entries))
	var mu stdsync.Mutex

	for _, e := range entries {
		pe := &PlatformEntry{
			Digest:    e.entry.Digest,
			MediaType: e.entry.MediaType,
			Position:  e.pos,
			Size:      int64(e.entry.Size),
		}
		if e.entry.Platform != nil {
			pe.OS = e.entry.Platform.OS
			pe.Architecture = e.entry.Platform.Architecture
			pe.Variant = e.entry.Platform.Variant
		}
		platformMap[e.pos] = pe
	}

	grp, gctx := errgroup.WithContext(ctx)
	for _, e := range entries {
		e := e
		grp.Go(func() error {
			childResp, err := f.fetchManifest(gctx, client, repoPath, e.entry.Digest, regName)
			if err != nil {
				clog.Info("Failed to fetch child manifest", "digest", e.entry.Digest, "tag", label, "error", err)
				return nil
			}

			parsed, err := parseSingleManifest(childResp.RawContent)
			if err != nil {
				clog.Warn("Failed to parse child manifest", "digest", e.entry.Digest, "error", err)
				return nil
			}

			mu.Lock()
			pe, ok := platformMap[e.pos]
			mu.Unlock()
			if !ok {
				return nil
			}

			pe.Raw = childResp.RawContent
			pe.MediaType = childResp.MediaType
			pe.Size = 0

			if parsed.Config.Digest != "" {
				pe.ConfigDigest = parsed.Config.Digest
				pe.ConfigSize = int64(parsed.Config.Size)
				pe.Size += pe.ConfigSize

				blob, _, err := f.fetchConfigBlob(gctx, client, repoPath, parsed.Config.Digest, regName)
				if err != nil {
					clog.Warn("Failed to fetch child config blob", "digest", parsed.Config.Digest, "platform", e.entry.Digest, "error", err)
				}
				if blob != nil {
					pe.ConfigRaw = []byte(blob.json)
					if blob.blob.Created != "" {
						if t, err := parseCreatedTime(blob.blob.Created); err == nil {
							pe.ConfigCreated = &t
						} else {
							clog.Debug("Failed to parse child config created time", "digest", parsed.Config.Digest, "created", blob.blob.Created, "error", err)
						}
					}
				}
			}

			for _, l := range parsed.Layers {
				pe.Layers = append(pe.Layers, layerEntry{
					Digest: l.Digest, Size: int64(l.Size), MediaType: l.MediaType,
				})
				pe.Size += int64(l.Size)
			}

			return nil
		})
	}

	if err := grp.Wait(); err != nil {
		return err
	}

	for _, e := range entries {
		if pe, ok := platformMap[e.pos]; ok {
			g.Platforms = append(g.Platforms, *pe)
		}
	}

	return nil
}

func (f *fetcher) fetchConfigBlob(ctx context.Context, client *registry.Client, repoPath, digest, regName string) (*cachedBlob, time.Duration, error) {
	if cached, ok := f.configs.get(digest); ok {
		return cached, 0, nil
	}

	release, err := f.limiter.acquire(ctx, regName)
	if err != nil {
		f.limiter.markFailure(regName)
		return nil, 0, err
	}
	defer release()
	resp, err := client.GetBlob(ctx, repoPath, digest)
	if err != nil {
		f.limiter.markFailure(regName)
		return nil, 0, err
	}
	f.limiter.resetFailures(regName)

	cb, err := parseConfigBlob(resp.Content)
	if err != nil {
		f.limiter.resetFailures(regName)
		return nil, 0, fmt.Errorf("parse config blob %s: %w", digest, err)
	}

	cached := &cachedBlob{blob: cb, json: string(resp.Content)}
	f.configs.set(digest, cached)
	return cached, time.Duration(0), nil
}

// Manifest parsing types (internal, not exported).

type manifestList struct {
	Manifests []manifestListEntry `json:"manifests"`
}

type manifestListEntry struct {
	MediaType   string            `json:"mediaType"`
	Size        int               `json:"size"`
	Digest      string            `json:"digest"`
	Platform    *manifestPlatform `json:"platform,omitempty"`
	Annotations map[string]string `json:"annotations,omitempty"`
}

type manifestPlatform struct {
	OS           string `json:"os"`
	Architecture string `json:"architecture"`
	Variant      string `json:"variant,omitempty"`
}

type singleManifest struct {
	Config      manifestDescriptor   `json:"config"`
	Layers      []manifestDescriptor `json:"layers"`
	Annotations map[string]string    `json:"annotations,omitempty"`
}

type manifestDescriptor struct {
	MediaType string `json:"mediaType"`
	Size      int    `json:"size"`
	Digest    string `json:"digest"`
}

func parseManifestList(body []byte) (*manifestList, error) {
	var ml manifestList
	if err := gojson.Unmarshal(body, &ml); err != nil {
		return nil, fmt.Errorf("parse manifest list: %w", err)
	}
	return &ml, nil
}

func parseSingleManifest(body []byte) (*singleManifest, error) {
	var sm singleManifest
	if err := gojson.Unmarshal(body, &sm); err != nil {
		return nil, fmt.Errorf("parse manifest: %w", err)
	}
	return &sm, nil
}

func parseConfigBlob(body []byte) (*registry.ConfigBlob, error) {
	var cb registry.ConfigBlob
	if err := gojson.Unmarshal(body, &cb); err != nil {
		return nil, fmt.Errorf("parse config blob: %w", err)
	}
	return &cb, nil
}

const helmConfigMediaType = "application/vnd.cncf.helm.config.v1+json"

type helmConfig struct {
	Name        string `json:"name"`
	Version     string `json:"version"`
	Description string `json:"description"`
	APIVersion  string `json:"apiVersion"`
	Type        string `json:"type"`
}

func parseHelmConfig(body []byte) (*helmConfig, error) {
	var hc helmConfig
	if err := gojson.Unmarshal(body, &hc); err != nil {
		return nil, fmt.Errorf("parse helm config: %w", err)
	}
	return &hc, nil
}

func isHelmConfig(mediaType string) bool {
	return mediaType == helmConfigMediaType
}

func parseCreatedTime(value string) (time.Time, error) {
	for _, layout := range []string{
		time.RFC3339Nano,
		time.RFC3339,
		"2006-01-02T15:04:05.999999999Z",
		"2006-01-02 15:04:05.999999999-07:00",
		"2006-01-02 15:04:05-07:00",
	} {
		if t, err := time.Parse(layout, value); err == nil {
			return t, nil
		}
	}
	return time.Time{}, fmt.Errorf("cannot parse time: %s", value)
}

func isManifestList(mediaType string) bool {
	return mediaType == "application/vnd.docker.distribution.manifest.list.v2+json" ||
		mediaType == "application/vnd.oci.image.index.v1+json"
}

func isAttestation(entry *manifestListEntry) bool {
	if entry.Annotations != nil {
		if ref, ok := entry.Annotations["vnd.docker.reference.type"]; ok && ref == "attestation-manifest" {
			return true
		}
	}
	if entry.Platform != nil && entry.Platform.OS == "unknown" && entry.Platform.Architecture == "unknown" {
		return true
	}
	return false
}

type lruCache[T any] struct {
	mu      stdsync.Mutex
	items   map[string]*lruNode[T]
	head    *lruNode[T]
	tail    *lruNode[T]
	maxSize int
	count   int
}

type lruNode[T any] struct {
	key   string
	value T
	prev  *lruNode[T]
	next  *lruNode[T]
}

func newLRU[T any](maxSize int) *lruCache[T] {
	return &lruCache[T]{items: make(map[string]*lruNode[T]), maxSize: maxSize}
}

func (c *lruCache[T]) get(key string) (T, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	node, ok := c.items[key]
	if !ok {
		var zero T
		return zero, false
	}
	c.moveToFront(node)
	return node.value, true
}

func (c *lruCache[T]) set(key string, value T) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if node, ok := c.items[key]; ok {
		node.value = value
		c.moveToFront(node)
		return
	}
	node := &lruNode[T]{key: key, value: value}
	c.items[key] = node
	c.addToFront(node)
	if c.count > c.maxSize {
		c.removeTail()
	}
}

func (c *lruCache[T]) moveToFront(node *lruNode[T]) {
	if node == c.head {
		return
	}
	c.remove(node)
	c.addToFront(node)
}

func (c *lruCache[T]) addToFront(node *lruNode[T]) {
	node.prev = nil
	node.next = c.head
	if c.head != nil {
		c.head.prev = node
	}
	c.head = node
	if c.tail == nil {
		c.tail = node
	}
	c.count++
}

func (c *lruCache[T]) remove(node *lruNode[T]) {
	if node.prev != nil {
		node.prev.next = node.next
	} else {
		c.head = node.next
	}
	if node.next != nil {
		node.next.prev = node.prev
	} else {
		c.tail = node.prev
	}
	node.prev, node.next = nil, nil
	c.count--
}

func (c *lruCache[T]) removeTail() {
	if c.tail != nil {
		delete(c.items, c.tail.key)
		c.remove(c.tail)
	}
}
