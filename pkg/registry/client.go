// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025  Bruno Bernard
//
// This file is part of Docker Registry UI (Container Hub).
//
// Docker Registry UI is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
//
// Docker Registry UI is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.

package registry

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// Client defines the interface for registry operations
type Client interface {
	GetRegistryName() string
	GetRegistryURL() string
	HealthCheck(ctx context.Context) error
	ListRepositories(ctx context.Context, opts *PaginationOpts) (*CatalogResponse, error)
	ListTags(ctx context.Context, repo string, opts *PaginationOpts) (*TagsResponse, error)
	GetManifest(ctx context.Context, repo, ref string, opts *ManifestOpts) (*ManifestResponse, error)
	HeadManifest(ctx context.Context, repo, ref string, opts *ManifestOpts) (*HeadManifestResponse, error)
	GetBlob(ctx context.Context, repo, digest string) (*BlobResponse, error)
}

// registryClient implements the Client interface
type registryClient struct {
	name       string
	baseURL    string
	username   string
	password   string
	httpClient *http.Client
}

// NewClient creates a new registry client
func NewClient(config RegistryConfig) Client {
	return &registryClient{
		name:     config.Name,
		baseURL:  strings.TrimSuffix(config.URL, "/"),
		username: config.Username,
		password: config.Password,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

func (c *registryClient) GetRegistryName() string {
	return c.name
}

func (c *registryClient) GetRegistryURL() string {
	return c.baseURL
}

// HealthCheck performs a health check on the registry (GET /v2/)
func (c *registryClient) HealthCheck(ctx context.Context) error {
	req, err := c.newRequest(ctx, "GET", "/v2/", nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("health check failed: status=%d body=%s", resp.StatusCode, string(body))
	}

	return nil
}

// ListRepositories lists all repositories in the registry
func (c *registryClient) ListRepositories(ctx context.Context, opts *PaginationOpts) (*CatalogResponse, error) {
	path := "/v2/_catalog"

	// Add pagination params if provided
	if opts != nil {
		params := url.Values{}
		if opts.N > 0 {
			params.Add("n", fmt.Sprintf("%d", opts.N))
		}
		if opts.Last != "" {
			params.Add("last", opts.Last)
		}
		if len(params) > 0 {
			path += "?" + params.Encode()
		}
	}

	req, err := c.newRequest(ctx, "GET", path, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("list repositories failed: status=%d body=%s", resp.StatusCode, string(body))
	}

	var catalog CatalogResponse
	if err := json.NewDecoder(resp.Body).Decode(&catalog); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &catalog, nil
}

// ListTags lists all tags for a repository
func (c *registryClient) ListTags(ctx context.Context, repo string, opts *PaginationOpts) (*TagsResponse, error) {
	path := fmt.Sprintf("/v2/%s/tags/list", repo)

	// Add pagination params if provided
	if opts != nil {
		params := url.Values{}
		if opts.N > 0 {
			params.Add("n", fmt.Sprintf("%d", opts.N))
		}
		if opts.Last != "" {
			params.Add("last", opts.Last)
		}
		if len(params) > 0 {
			path += "?" + params.Encode()
		}
	}

	req, err := c.newRequest(ctx, "GET", path, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("list tags failed: status=%d body=%s", resp.StatusCode, string(body))
	}

	var tags TagsResponse
	if err := json.NewDecoder(resp.Body).Decode(&tags); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &tags, nil
}

// GetManifest retrieves a manifest for a specific tag or digest
func (c *registryClient) GetManifest(ctx context.Context, repo, ref string, opts *ManifestOpts) (*ManifestResponse, error) {
	path := fmt.Sprintf("/v2/%s/manifests/%s", repo, ref)

	req, err := c.newRequest(ctx, "GET", path, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Set Accept header for manifest version
	acceptHeader := "application/vnd.docker.distribution.manifest.v2+json"
	if opts != nil && opts.Accept != "" {
		acceptHeader = opts.Accept
	}
	req.Header.Set("Accept", acceptHeader)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("get manifest failed: status=%d body=%s", resp.StatusCode, string(body))
	}

	// Read body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	// Parse manifest
	var manifest ManifestResponse
	if err := json.Unmarshal(body, &manifest); err != nil {
		return nil, fmt.Errorf("failed to decode manifest: %w", err)
	}

	// Store raw body for digest calculation
	manifest.RawBody = body

	// Store Docker-Content-Digest header if present
	if digest := resp.Header.Get("Docker-Content-Digest"); digest != "" {
		manifest.ContentDigest = digest
	}

	// Store all headers
	manifest.RawHeaders = make(map[string]string)
	for key, values := range resp.Header {
		if len(values) > 0 {
			manifest.RawHeaders[key] = values[0]
		}
	}

	// Store full JSON for OCI manifests
	var rawJSON map[string]interface{}
	if err := json.Unmarshal(body, &rawJSON); err == nil {
		manifest.Raw = rawJSON
	}

	return &manifest, nil
}

// HeadManifest gets manifest digest without downloading full manifest (optimization)
func (c *registryClient) HeadManifest(ctx context.Context, repo, ref string, opts *ManifestOpts) (*HeadManifestResponse, error) {
	path := fmt.Sprintf("/v2/%s/manifests/%s", repo, ref)

	req, err := c.newRequest(ctx, "HEAD", path, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Set Accept header for both single-arch and multi-arch manifests
	acceptHeader := "application/vnd.docker.distribution.manifest.v2+json," +
		"application/vnd.docker.distribution.manifest.list.v2+json," +
		"application/vnd.oci.image.manifest.v1+json," +
		"application/vnd.oci.image.index.v1+json"
	if opts != nil && opts.Accept != "" {
		acceptHeader = opts.Accept
	}
	req.Header.Set("Accept", acceptHeader)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HEAD manifest failed: status=%d", resp.StatusCode)
	}

	return &HeadManifestResponse{
		ContentDigest: resp.Header.Get("Docker-Content-Digest"),
		MediaType:     resp.Header.Get("Content-Type"),
	}, nil
}

// GetBlob fetches a blob (typically config) from registry
func (c *registryClient) GetBlob(ctx context.Context, repo, digest string) (*BlobResponse, error) {
	path := fmt.Sprintf("/v2/%s/blobs/%s", repo, digest)

	req, err := c.newRequest(ctx, "GET", path, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("get blob failed: status=%d body=%s", resp.StatusCode, string(body))
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read blob: %w", err)
	}

	return &BlobResponse{Data: data}, nil
}

// newRequest creates a new HTTP request with authentication
func (c *registryClient) newRequest(ctx context.Context, method, path string, body io.Reader) (*http.Request, error) {
	url := c.baseURL + path

	req, err := http.NewRequestWithContext(ctx, method, url, body)
	if err != nil {
		return nil, err
	}

	// Add basic auth if credentials provided
	if c.username != "" && c.password != "" {
		req.SetBasicAuth(c.username, c.password)
	}

	// Set common headers
	req.Header.Set("User-Agent", "docker-registry-ui/1.0")

	return req, nil
}
