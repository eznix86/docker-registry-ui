package http

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type RegistryClient struct {
	baseURL    string
	httpClient *http.Client
	username   string
	password   string
}

type CatalogResponse struct {
	Repositories []string `json:"repositories"`
}

type TagsResponse struct {
	Name string   `json:"name"`
	Tags []string `json:"tags"`
}

type ManifestType string

const (
	ManifestTypeDockerV1           ManifestType = "application/vnd.docker.distribution.manifest.v1+json"
	ManifestTypeDockerV2           ManifestType = "application/vnd.docker.distribution.manifest.v2+json"
	ManifestTypeDockerV2List       ManifestType = "application/vnd.docker.distribution.manifest.list.v2+json"
	ManifestTypeOCIImage           ManifestType = "application/vnd.oci.image.manifest.v1+json"
	ManifestTypeOCIImageIndex      ManifestType = "application/vnd.oci.image.index.v1+json"
)

type ManifestResponse struct {
	SchemaVersion int                    `json:"schemaVersion"`
	MediaType     string                 `json:"mediaType"`
	Config        *ManifestConfig        `json:"config,omitempty"`
	Layers        []ManifestLayer        `json:"layers,omitempty"`
	Manifests     []PlatformManifest     `json:"manifests,omitempty"`
	Annotations   map[string]string      `json:"annotations,omitempty"`

	// Docker v1 legacy fields
	Name         string                 `json:"name,omitempty"`
	Tag          string                 `json:"tag,omitempty"`
	Architecture string                 `json:"architecture,omitempty"`
	FsLayers     []FsLayer              `json:"fsLayers,omitempty"`
	History      []V1History            `json:"history,omitempty"`
}

type ManifestConfig struct {
	MediaType string `json:"mediaType"`
	Size      int64  `json:"size"`
	Digest    string `json:"digest"`
}

type ManifestLayer struct {
	MediaType string `json:"mediaType"`
	Size      int64  `json:"size"`
	Digest    string `json:"digest"`
	URLs      []string `json:"urls,omitempty"`
}

type PlatformManifest struct {
	MediaType string    `json:"mediaType"`
	Size      int64     `json:"size"`
	Digest    string    `json:"digest"`
	Platform  *Platform `json:"platform,omitempty"`
}

type Platform struct {
	Architecture string   `json:"architecture"`
	OS           string   `json:"os"`
	OSVersion    string   `json:"os.version,omitempty"`
	OSFeatures   []string `json:"os.features,omitempty"`
	Variant      string   `json:"variant,omitempty"`
	Features     []string `json:"features,omitempty"`
}

type FsLayer struct {
	BlobSum string `json:"blobSum"`
}

type V1History struct {
	V1Compatibility string `json:"v1Compatibility"`
}

type BlobInfo struct {
	ContentLength string
	ContentType   string
	Digest        string
	Exists        bool
}

func NewRegistryClient(baseURL string, username, password string) *RegistryClient {
	if !strings.HasPrefix(baseURL, "http://") && !strings.HasPrefix(baseURL, "https://") {
		baseURL = "https://" + baseURL
	}

	baseURL = strings.TrimSuffix(baseURL, "/")

	return &RegistryClient{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		username: username,
		password: password,
	}
}

func (c *RegistryClient) makeRequest(method, path string) (*http.Response, error) {
	fullURL := c.baseURL + path

	req, err := http.NewRequest(method, fullURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	if c.username != "" && c.password != "" {
		req.SetBasicAuth(c.username, c.password)
	}

	req.Header.Set("User-Agent", "registry-client/1.0")

	if method == "GET" {
		acceptHeaders := []string{
			string(ManifestTypeDockerV2),
			string(ManifestTypeDockerV2List),
			string(ManifestTypeOCIImage),
			string(ManifestTypeOCIImageIndex),
			string(ManifestTypeDockerV1),
		}
		req.Header.Set("Accept", strings.Join(acceptHeaders, ","))
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}

	return resp, nil
}

func (c *RegistryClient) GetCatalog() (*CatalogResponse, error) {
	resp, err := c.makeRequest("GET", "/v2/_catalog")
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("catalog request failed with status %d: %s", resp.StatusCode, string(body))
	}

	var catalog CatalogResponse
	if err := json.NewDecoder(resp.Body).Decode(&catalog); err != nil {
		return nil, fmt.Errorf("failed to decode catalog response: %w", err)
	}

	return &catalog, nil
}

func (c *RegistryClient) GetTags(repository string) (*TagsResponse, error) {
	encodedRepo := url.PathEscape(repository)
	path := fmt.Sprintf("/v2/%s/tags/list", encodedRepo)

	resp, err := c.makeRequest("GET", path)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("tags request failed with status %d: %s", resp.StatusCode, string(body))
	}

	var tags TagsResponse
	if err := json.NewDecoder(resp.Body).Decode(&tags); err != nil {
		return nil, fmt.Errorf("failed to decode tags response: %w", err)
	}

	return &tags, nil
}

func (c *RegistryClient) GetManifest(repository, reference string) (*ManifestResponse, []byte, string, error) {
	encodedRepo := url.PathEscape(repository)
	encodedRef := url.PathEscape(reference)
	path := fmt.Sprintf("/v2/%s/manifests/%s", encodedRepo, encodedRef)

	resp, err := c.makeRequest("GET", path)
	if err != nil {
		return nil, nil, "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, nil, "", fmt.Errorf("manifest request failed with status %d: %s", resp.StatusCode, string(body))
	}

	contentType := resp.Header.Get("Content-Type")
	dockerContentDigest := resp.Header.Get("Docker-Content-Digest")

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, nil, "", fmt.Errorf("failed to read manifest response: %w", err)
	}

	var manifest ManifestResponse
	if err := json.Unmarshal(body, &manifest); err != nil {
		return nil, body, contentType, fmt.Errorf("failed to decode manifest response: %w", err)
	}

	if manifest.MediaType == "" {
		manifest.MediaType = contentType
	}

	return &manifest, body, dockerContentDigest, nil
}

func (c *RegistryClient) GetManifestWithType(repository, reference string, manifestType ManifestType) (*ManifestResponse, []byte, string, error) {
	encodedRepo := url.PathEscape(repository)
	encodedRef := url.PathEscape(reference)
	path := fmt.Sprintf("/v2/%s/manifests/%s", encodedRepo, encodedRef)

	fullURL := c.baseURL + path

	req, err := http.NewRequest("GET", fullURL, nil)
	if err != nil {
		return nil, nil, "", fmt.Errorf("failed to create request: %w", err)
	}

	if c.username != "" && c.password != "" {
		req.SetBasicAuth(c.username, c.password)
	}

	req.Header.Set("User-Agent", "registry-client/1.0")
	req.Header.Set("Accept", string(manifestType))

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, nil, "", fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, nil, "", fmt.Errorf("manifest request failed with status %d: %s", resp.StatusCode, string(body))
	}

	contentType := resp.Header.Get("Content-Type")
	dockerContentDigest := resp.Header.Get("Docker-Content-Digest")

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, nil, "", fmt.Errorf("failed to read manifest response: %w", err)
	}

	var manifest ManifestResponse
	if err := json.Unmarshal(body, &manifest); err != nil {
		return nil, body, contentType, fmt.Errorf("failed to decode manifest response: %w", err)
	}

	if manifest.MediaType == "" {
		manifest.MediaType = contentType
	}

	return &manifest, body, dockerContentDigest, nil
}

func (c *RegistryClient) GetBlob(repository, digest string) (io.ReadCloser, error) {
	encodedRepo := url.PathEscape(repository)
	path := fmt.Sprintf("/v2/%s/blobs/%s", encodedRepo, digest)

	resp, err := c.makeRequest("GET", path)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		resp.Body.Close()
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("blob request failed with status %d: %s", resp.StatusCode, string(body))
	}

	return resp.Body, nil
}

func (c *RegistryClient) HeadBlob(repository, digest string) (*BlobInfo, error) {
	encodedRepo := url.PathEscape(repository)
	path := fmt.Sprintf("/v2/%s/blobs/%s", encodedRepo, digest)

	resp, err := c.makeRequest("HEAD", path)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	blobInfo := &BlobInfo{
		ContentLength: resp.Header.Get("Content-Length"),
		ContentType:   resp.Header.Get("Content-Type"),
		Digest:        resp.Header.Get("Docker-Content-Digest"),
		Exists:        resp.StatusCode == http.StatusOK,
	}

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNotFound {
		return blobInfo, fmt.Errorf("blob head request failed with status %d", resp.StatusCode)
	}

	return blobInfo, nil
}



func (c *RegistryClient) CheckHealth() int {

	resp, err := c.makeRequest("GET", "/v2/")

	if err != nil {
		return -1
	}

	defer resp.Body.Close()

	return resp.StatusCode
}

func (m *ManifestResponse) GetManifestType() ManifestType {
	return ManifestType(m.MediaType)
}

func (m *ManifestResponse) IsMultiArch() bool {
	manifestType := m.GetManifestType()
	return manifestType == ManifestTypeDockerV2List || manifestType == ManifestTypeOCIImageIndex
}

func (m *ManifestResponse) IsOCI() bool {
	manifestType := m.GetManifestType()
	return manifestType == ManifestTypeOCIImage || manifestType == ManifestTypeOCIImageIndex
}

func (m *ManifestResponse) IsLegacyV1() bool {
	return m.GetManifestType() == ManifestTypeDockerV1
}

func (c *RegistryClient) DeleteManifest(repository, reference string) error {
	encodedRepo := url.PathEscape(repository)
	encodedRef := url.PathEscape(reference)
	path := fmt.Sprintf("/v2/%s/manifests/%s", encodedRepo, encodedRef)

	resp, err := c.makeRequest("DELETE", path)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusAccepted && resp.StatusCode != http.StatusNoContent {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("delete manifest failed with status %d: %s", resp.StatusCode, string(body))
	}

	return nil
}