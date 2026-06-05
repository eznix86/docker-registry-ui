package helm

import (
	"archive/tar"
	"compress/gzip"
	"container/list"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"path"
	"strings"
	"sync"

	"github.com/eznix86/docker-registry-ui/internal/registry"
	registryclient "github.com/eznix86/registry-client"
)

const (
	chartMetadataFile = "Chart.yaml"
	chartValuesFile   = "values.yaml"

	// MediaTypeHelmChartContent is the OCI media type of the Helm chart tarball layer.
	MediaTypeHelmChartContent = "application/vnd.cncf.helm.chart.content.v1.tar+gzip"

	// MaxChartSize is the upper bound on the chart tarball we will decompress.
	// 50 MiB is generous; the largest charts in the wild are well under 10 MiB.
	MaxChartSize = 50 * 1024 * 1024
)

// ErrNotHelmChart is returned when the manifest is not a Helm chart.
var ErrNotHelmChart = errors.New("not a helm chart")

// File is a single file extracted from a chart tarball.
type File struct {
	Path    string `json:"path"`
	Content string `json:"content"`
}

// Chart is the extracted contents of a Helm chart.
type Chart struct {
	Values    string `json:"values"`
	ChartYAML string `json:"chartYaml"`
	Files     []File `json:"files"`
}

// tarEntry is an internal helper for the extraction pipeline.
type tarEntry struct {
	name string
	body []byte
}

// Reader fetches Helm charts on demand and caches them in memory.
type Reader struct {
	mu      sync.Mutex
	entries *list.List
	items   map[string]*list.Element
	maxSize int
}

// NewReader returns a Reader that caches up to maxSize charts in memory.
func NewReader(maxSize int) *Reader {
	if maxSize <= 0 {
		maxSize = 50
	}
	return &Reader{
		entries: list.New(),
		items:   make(map[string]*list.Element, maxSize),
		maxSize: maxSize,
	}
}

type cacheEntry struct {
	key   string
	chart *Chart
}

func (r *Reader) get(key string) *Chart {
	r.mu.Lock()
	defer r.mu.Unlock()
	el, ok := r.items[key]
	if !ok {
		return nil
	}
	r.entries.MoveToFront(el)
	entry, ok := el.Value.(*cacheEntry)
	if !ok {
		delete(r.items, key)
		r.entries.Remove(el)
		return nil
	}
	return entry.chart
}

func (r *Reader) put(key string, chart *Chart) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if el, ok := r.items[key]; ok {
		entry, ok := el.Value.(*cacheEntry)
		if !ok {
			delete(r.items, key)
			r.entries.Remove(el)
			return
		}
		entry.chart = chart
		r.entries.MoveToFront(el)
		return
	}
	el := r.entries.PushFront(&cacheEntry{key: key, chart: chart})
	r.items[key] = el
	for r.entries.Len() > r.maxSize {
		oldest := r.entries.Back()
		if oldest == nil {
			break
		}
		r.entries.Remove(oldest)
		entry, ok := oldest.Value.(*cacheEntry)
		if ok {
			delete(r.items, entry.key)
		}
	}
}

// Read downloads and extracts the chart referenced by tag from the given
// repository on the supplied registry client.
func (r *Reader) Read(ctx context.Context, client *registry.Client, repo, tag string) (*Chart, error) {
	cacheKey := client.Host() + "/" + repo + ":" + tag
	if cached := r.get(cacheKey); cached != nil {
		return cached, nil
	}

	manifest, err := client.GetManifest(ctx, repo, tag)
	if err != nil {
		return nil, fmt.Errorf("fetch manifest: %w", err)
	}

	layerDigest, err := findHelmLayer(manifest)
	if err != nil {
		return nil, err
	}

	blob, err := client.GetBlob(ctx, repo, layerDigest)
	if err != nil {
		return nil, fmt.Errorf("fetch chart layer %s: %w", layerDigest, err)
	}
	if int64(len(blob.Content)) > MaxChartSize {
		return nil, fmt.Errorf("chart layer too large: %d bytes (max %d)", len(blob.Content), MaxChartSize)
	}

	chart, err := extractChart(blob.Content)
	if err != nil {
		return nil, fmt.Errorf("extract chart: %w", err)
	}

	r.put(cacheKey, chart)
	return chart, nil
}

// findHelmLayer inspects a manifest and returns the digest of the single
// Helm chart content layer.
func findHelmLayer(m *registryclient.ManifestResponse) (string, error) {
	var data struct {
		Layers []struct {
			MediaType string `json:"mediaType"`
			Digest    string `json:"digest"`
		} `json:"layers"`
	}
	if len(m.RawContent) == 0 {
		return "", errors.New("manifest has no raw content")
	}
	if err := json.Unmarshal(m.RawContent, &data); err != nil {
		return "", fmt.Errorf("parse manifest: %w", err)
	}
	for _, l := range data.Layers {
		if l.MediaType == MediaTypeHelmChartContent {
			return l.Digest, nil
		}
	}
	return "", fmt.Errorf("%w: no %s layer in manifest", ErrNotHelmChart, MediaTypeHelmChartContent)
}

// extractChart decompresses a gzipped tar archive and returns its files.
//
// Helm chart tarballs follow the convention <chart-name>/{Chart.yaml,values.yaml,templates/...}.
// extractChart detects that top-level directory and strips it so callers see
// paths relative to the chart root.
func entryNames(entries []tarEntry) []string {
	out := make([]string, len(entries))
	for i, e := range entries {
		out[i] = e.name
	}
	return out
}

func extractChart(content []byte) (*Chart, error) {
	entries, err := readTarEntries(content)
	if err != nil {
		return nil, err
	}
	prefix := detectChartPrefix(entryNames(entries))
	return buildChart(entries, prefix), nil
}

func readTarEntries(content []byte) ([]tarEntry, error) {
	gz, err := gzip.NewReader(strings.NewReader(string(content)))
	if err != nil {
		return nil, fmt.Errorf("gzip reader: %w", err)
	}
	defer func() {
		if cerr := gz.Close(); cerr != nil {
			return
		}
	}()

	var entries []tarEntry
	tr := tar.NewReader(gz)
	for {
		hdr, err := tr.Next()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("read tar entry: %w", err)
		}
		if hdr.Typeflag != tar.TypeReg {
			continue
		}
		body, err := readLimitedEntry(tr, hdr.Name)
		if err != nil {
			return nil, err
		}
		entries = append(entries, tarEntry{name: hdr.Name, body: body})
	}
	return entries, nil
}

func readLimitedEntry(tr *tar.Reader, name string) ([]byte, error) {
	body, err := io.ReadAll(io.LimitReader(tr, MaxChartSize+1))
	if err != nil {
		return nil, fmt.Errorf("read file %s: %w", name, err)
	}
	if len(body) > MaxChartSize {
		return nil, fmt.Errorf("file %s too large", name)
	}
	return body, nil
}

func buildChart(entries []tarEntry, prefix string) *Chart {
	chart := &Chart{}
	for _, e := range entries {
		name := cleanChartEntryName(e.name, prefix)
		if name == "" {
			continue
		}
		assignChartEntry(chart, name, e.body)
	}
	return chart
}

func cleanChartEntryName(name, prefix string) string {
	name = strings.TrimPrefix(name, prefix)
	name = path.Clean(name)
	if name == "." || strings.HasPrefix(name, "..") || path.IsAbs(name) {
		return ""
	}
	return name
}

func assignChartEntry(chart *Chart, name string, body []byte) {
	switch name {
	case chartValuesFile:
		chart.Values = string(body)
	case chartMetadataFile:
		chart.ChartYAML = string(body)
	default:
		if strings.HasPrefix(name, "templates/") {
			chart.Files = append(chart.Files, File{Path: name, Content: string(body)})
		}
	}
}

// detectChartPrefix returns a common "<dir>/" prefix shared by every name,
// or "" if no such prefix exists. Helm chart tarballs always wrap their
// contents in a single top-level directory matching the chart name.
//
// This is order-independent: it picks the top-level directory used by
// every entry rather than trusting the first iteration of a map.
func detectChartPrefix(names []string) string {
	if len(names) == 0 {
		return ""
	}
	// Collect every unique top-level segment that any name starts with.
	// They must all agree on a single segment.
	var shared string
	for _, n := range names {
		head := n
		if before, _, ok := strings.Cut(n, "/"); ok {
			head = before
		}
		if head == n {
			// Name has no directory component; the chart isn't wrapped.
			return ""
		}
		if shared == "" {
			shared = head
		} else if shared != head {
			return ""
		}
	}
	return shared + "/"
}
