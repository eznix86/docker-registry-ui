package registry

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"net"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	clog "github.com/charmbracelet/log"
	registryclient "github.com/eznix86/registry-client"
)

const (
	requestTimeout          = 30 * time.Second
	dialTimeout             = 10 * time.Second
	tlsTimeout              = 10 * time.Second
	responseHeaderTimeout   = 10 * time.Second
	keepAliveInterval       = 30 * time.Second
	idleConnTimeout         = 90 * time.Second
	expectContinueTimeout   = 1 * time.Second
	networkErrorBackoffBase = 200 * time.Millisecond
)

type Config struct {
	Name        string
	URL         string
	Username    string
	Password    string
	IsGitHub    bool
	IsGitHubOrg bool
}

type Client struct {
	registryclient.RegistryClient
	name string
	host string
}

func (c *Client) Name() string { return c.name }
func (c *Client) Host() string { return c.host }

type Manager struct {
	clients map[string]*Client
	mu      sync.RWMutex
}

type logAdapter struct{}

func (l *logAdapter) Debug(msg string, args ...any) { clog.Debug(msg, args...) }
func (l *logAdapter) Info(msg string, args ...any)  { clog.Info(msg, args...) }
func (l *logAdapter) Warn(msg string, args ...any)  { clog.Warn(msg, args...) }
func (l *logAdapter) Error(msg string, args ...any) { clog.Error(msg, args...) }

func New(configs []Config, httpMaxRetries int, disableTagDeletion bool) (*Manager, error) {
	if len(configs) == 0 {
		return nil, errors.New("no registry configurations provided")
	}

	m := &Manager{clients: make(map[string]*Client)}
	for _, cfg := range configs {
		m.clients[cfg.Name] = m.newClient(cfg, httpMaxRetries, disableTagDeletion)
	}
	return m, nil
}

func (m *Manager) GetClient(name string) (*Client, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	c, ok := m.clients[name]
	if !ok {
		return nil, fmt.Errorf("registry %q not found", name)
	}
	return c, nil
}

func (m *Manager) ListRegistries() []string {
	m.mu.RLock()
	defer m.mu.RUnlock()
	names := make([]string, 0, len(m.clients))
	for n := range m.clients {
		names = append(names, n)
	}
	return names
}

func (m *Manager) newClient(cfg Config, httpMaxRetries int, disableTagDeletion bool) *Client {
	hc := &http.Client{
		Timeout: requestTimeout,
		Transport: &http.Transport{
			Proxy:                 http.ProxyFromEnvironment,
			DialContext:           (&net.Dialer{Timeout: dialTimeout, KeepAlive: keepAliveInterval}).DialContext,
			MaxIdleConns:          256,
			MaxIdleConnsPerHost:   64,
			MaxConnsPerHost:       64,
			IdleConnTimeout:       idleConnTimeout,
			TLSHandshakeTimeout:   tlsTimeout,
			ResponseHeaderTimeout: responseHeaderTimeout,
			ExpectContinueTimeout: expectContinueTimeout,
		},
	}

	var libClient registryclient.RegistryClient
	maxAttempts := httpMaxRetries + 1
	host := extractHost(cfg.URL)

	if cfg.IsGitHub {
		libClient = buildGitHubClient(cfg, hc, maxAttempts, disableTagDeletion)
	} else {
		libClient = buildBaseClient(cfg, hc, maxAttempts, disableTagDeletion)
	}

	return &Client{RegistryClient: libClient, name: cfg.Name, host: host}
}

func buildBaseClient(cfg Config, hc *http.Client, maxAttempts int, disableDelete bool) *registryclient.BaseClient {
	bc := &registryclient.BaseClient{
		HTTPClient:    hc,
		BaseURL:       strings.TrimSuffix(cfg.URL, "/"),
		RetryBackoff:  networkErrorBackoffBase,
		MaxAttempts:   maxAttempts,
		Logger:        &logAdapter{},
		DisableDelete: disableDelete,
	}
	if cfg.Username != "" && cfg.Password != "" {
		bc.Auth = registryclient.BasicAuth{Username: cfg.Username, Password: cfg.Password}
	}
	return bc
}

func buildGitHubClient(cfg Config, hc *http.Client, maxAttempts int, disableDelete bool) *registryclient.GitHubClient {
	var gc *registryclient.GitHubClient
	if cfg.IsGitHubOrg {
		gc = registryclient.NewGitHubOrgClient(cfg.Username, cfg.Password)
	} else {
		gc = registryclient.NewGitHubClient(cfg.Username, cfg.Password)
	}
	gc.HTTPClient = hc
	gc.RetryBackoff = networkErrorBackoffBase
	gc.MaxAttempts = maxAttempts
	gc.Logger = &logAdapter{}
	gc.DisableDelete = disableDelete
	return gc
}

func extractHost(rawURL string) string {
	s := strings.TrimPrefix(rawURL, "https://")
	s = strings.TrimPrefix(s, "http://")
	if idx := strings.Index(s, "/"); idx >= 0 {
		s = s[:idx]
	}
	return s
}

func LoadConfigs() ([]Config, error) {
	var configs []Config
	if cfg := loadDefaultConfig(); cfg != nil {
		configs = append(configs, *cfg)
	}
	named, err := loadNamedConfigs()
	if err != nil {
		return nil, err
	}
	configs = append(configs, named...)
	clog.Debug("Registry configs loaded", "count", len(configs))
	if len(configs) == 0 {
		return nil, errors.New("no registry configurations found (REGISTRY_URL or REGISTRY_URL_* required)")
	}
	return configs, nil
}

func LoadConfigsFallback() []Config {
	configs, err := LoadConfigs()
	if err != nil {
		clog.Warn("Failed to load registry configs, using empty list", "error", err)
		return nil
	}
	return configs
}

func loadDefaultConfig() *Config {
	url := os.Getenv("REGISTRY_URL")
	if url == "" {
		return nil
	}
	cfg := &Config{Name: "default", URL: url}
	if auth := parseAuthEnv("REGISTRY_AUTH"); auth != nil {
		cfg.Username = auth.user
		cfg.Password = auth.pass
	}
	if isGHCR(url) {
		cfg.IsGitHub = true
		cfg.IsGitHubOrg = os.Getenv("REGISTRY_SETTINGS_ORG") == "true"
	}
	return cfg
}

func loadNamedConfigs() ([]Config, error) {
	var configs []Config
	seen := make(map[string]bool)

	for _, entry := range os.Environ() {
		k, v, ok := parseEnvLine(entry)
		if !ok || !strings.HasPrefix(k, "REGISTRY_URL_") {
			continue
		}
		suffix := strings.TrimPrefix(k, "REGISTRY_URL_")
		if seen[suffix] {
			continue
		}
		seen[suffix] = true

		cfg := Config{
			Name: strings.ToLower(suffix),
			URL:  v,
		}
		if auth := parseAuthEnv("REGISTRY_AUTH_" + suffix); auth != nil {
			cfg.Username = auth.user
			cfg.Password = auth.pass
		}
		if isGHCR(v) {
			cfg.IsGitHub = true
			cfg.IsGitHubOrg = strings.ToLower(os.Getenv("REGISTRY_SETTINGS_"+suffix+"_ORG")) == "true"
		}
		configs = append(configs, cfg)
	}
	return configs, nil
}

type authPair struct{ user, pass string }

func parseAuthEnv(key string) *authPair {
	encoded := os.Getenv(key)
	if encoded == "" {
		return nil
	}
	decoded, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return nil
	}
	parts := strings.SplitN(string(decoded), ":", 2)
	if len(parts) != 2 {
		return nil
	}
	return &authPair{user: parts[0], pass: parts[1]}
}

func parseEnvLine(entry string) (key, value string, ok bool) {
	parts := strings.SplitN(entry, "=", 2)
	if len(parts) != 2 {
		return "", "", false
	}
	return parts[0], parts[1], true
}

func isGHCR(url string) bool {
	return strings.Contains(url, "ghcr.io")
}

// Manifest media types.
const (
	MediaTypeDockerManifestV2   = "application/vnd.docker.distribution.manifest.v2+json"
	MediaTypeDockerManifestList = "application/vnd.docker.distribution.manifest.list.v2+json"
	MediaTypeOCIManifestV1      = "application/vnd.oci.image.manifest.v1+json"
	MediaTypeOCIImageIndex      = "application/vnd.oci.image.index.v1+json"
	AcceptAllManifests          = MediaTypeDockerManifestV2 + "," +
		MediaTypeDockerManifestList + "," +
		MediaTypeOCIManifestV1 + "," +
		MediaTypeOCIImageIndex
)

// ConfigBlob represents parsed config blob JSON.
type ConfigBlob struct {
	Created      string `json:"created"`
	OS           string `json:"os"`
	Architecture string `json:"architecture"`
	Config       struct {
		Labels map[string]string `json:"Labels"`
	} `json:"config"`
}

// Catalog provides paginated repository listing for a registry.
func (c *Client) Catalog(ctx context.Context) ([]string, error) {
	var repos []string
	last := ""
	for {
		resp, err := c.GetCatalog(ctx, &registryclient.PaginationParams{N: 100, Last: last})
		if err != nil {
			return nil, err
		}
		repos = append(repos, resp.Repositories...)
		if len(resp.Repositories) < 100 {
			break
		}
		last = resp.Repositories[len(resp.Repositories)-1]
		select {
		case <-ctx.Done():
			return repos, ctx.Err()
		default:
		}
	}
	return repos, nil
}

// Tags provides paginated tag listing for a repository.
func (c *Client) Tags(ctx context.Context, repo string) ([]string, error) {
	var tags []string
	last := ""
	for {
		resp, err := c.ListTags(ctx, repo, &registryclient.PaginationParams{N: 100, Last: last})
		if err != nil {
			return nil, err
		}
		tags = append(tags, resp.Tags...)
		if len(resp.Tags) < 100 {
			break
		}
		last = resp.Tags[len(resp.Tags)-1]
		select {
		case <-ctx.Done():
			return tags, ctx.Err()
		default:
		}
	}
	return tags, nil
}
