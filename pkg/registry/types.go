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

// PaginationOpts contains pagination parameters for list operations
type PaginationOpts struct {
	N    int    // Number of results per page
	Last string // Last item from previous page (for pagination)
}

// CatalogResponse represents the response from /v2/_catalog
type CatalogResponse struct {
	Repositories []string `json:"repositories"`
}

// TagsResponse represents the response from /v2/<name>/tags/list
type TagsResponse struct {
	Name string   `json:"name"`
	Tags []string `json:"tags"`
}

// ManifestOpts contains options for getting manifests
type ManifestOpts struct {
	Accept string // Accept header (e.g., "application/vnd.docker.distribution.manifest.v2+json")
}

// ManifestResponse represents a manifest (simplified, can be expanded)
type ManifestResponse struct {
	SchemaVersion int               `json:"schemaVersion"`
	MediaType     string            `json:"mediaType"`
	Config        ManifestConfig    `json:"config"`
	Layers        []ManifestLayer   `json:"layers"`
	RawBody       []byte            `json:"-"` // Store raw JSON for digest calculation
	ContentDigest string            `json:"-"` // Docker-Content-Digest header
	RawHeaders    map[string]string `json:"-"` // Store all headers
	Raw           map[string]any    `json:"-"` // Store full JSON for OCI manifests
}

// ManifestConfig represents the config section of a manifest
type ManifestConfig struct {
	MediaType string `json:"mediaType"`
	Size      int64  `json:"size"`
	Digest    string `json:"digest"`
}

// ManifestLayer represents a layer in a manifest
type ManifestLayer struct {
	MediaType string `json:"mediaType"`
	Size      int64  `json:"size"`
	Digest    string `json:"digest"`
}

// HeadManifestResponse represents the response from a HEAD request to manifests
type HeadManifestResponse struct {
	ContentDigest string // Docker-Content-Digest header
	MediaType     string // Content-Type header
}

// BlobResponse represents a blob (config) from registry
type BlobResponse struct {
	Data []byte // Raw JSON bytes
}

// ConfigBlob represents the parsed config blob JSON
type ConfigBlob struct {
	Created      string `json:"created"`
	OS           string `json:"os"`
	Architecture string `json:"architecture"`
	Config       struct {
		Labels map[string]string `json:"Labels"`
	} `json:"config"`
}
