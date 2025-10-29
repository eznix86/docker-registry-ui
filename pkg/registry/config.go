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
	"encoding/base64"
	"fmt"
	"os"
	"strings"
)

// RegistryConfig holds configuration for a single registry
type RegistryConfig struct {
	Name     string // e.g., "default", "personal"
	URL      string // e.g., "https://repository.a.com"
	Username string // decoded from base64 auth
	Password string // decoded from base64 auth
}

// LoadRegistryConfigs loads all registry configurations from environment variables
// Pattern:
//
//	REGISTRY_URL=https://repository.a.com
//	REGISTRY_AUTH=base64(username:password)
//	REGISTRY_URL_PERSONAL=https://repository.b.com
//	REGISTRY_AUTH_PERSONAL=base64(username:password)
func LoadRegistryConfigs() ([]RegistryConfig, error) {
	var configs []RegistryConfig

	// First, try to load default registry (REGISTRY_URL)
	if url := os.Getenv("REGISTRY_URL"); url != "" {
		config := RegistryConfig{
			Name: "default",
			URL:  url,
		}

		// Check for auth
		if auth := os.Getenv("REGISTRY_AUTH"); auth != "" {
			username, password, err := decodeAuth(auth)
			if err != nil {
				return nil, fmt.Errorf("failed to decode REGISTRY_AUTH: %w", err)
			}
			config.Username = username
			config.Password = password
		}

		configs = append(configs, config)
	}

	// Scan for suffixed registries (REGISTRY_URL_*)
	suffixedConfigs, err := loadSuffixedConfigs()
	if err != nil {
		return nil, err
	}

	configs = append(configs, suffixedConfigs...)

	if len(configs) == 0 {
		return nil, fmt.Errorf("no registry configurations found (REGISTRY_URL or REGISTRY_URL_* required)")
	}

	return configs, nil
}

// loadSuffixedConfigs scans environment for REGISTRY_URL_* variables
func loadSuffixedConfigs() ([]RegistryConfig, error) {
	var configs []RegistryConfig
	seen := make(map[string]bool)

	// Get all environment variables
	environ := os.Environ()

	for _, entry := range environ {
		// Split at first '='
		parts := strings.SplitN(entry, "=", 2)
		if len(parts) != 2 {
			continue
		}

		key := parts[0]
		value := parts[1]

		// Check if it's a REGISTRY_URL_* variable
		if strings.HasPrefix(key, "REGISTRY_URL_") && key != "REGISTRY_URL" {
			// Extract suffix (e.g., "PERSONAL" from "REGISTRY_URL_PERSONAL")
			suffix := strings.TrimPrefix(key, "REGISTRY_URL_")

			// Skip if we've already seen this suffix
			if seen[suffix] {
				continue
			}
			seen[suffix] = true

			// Create config
			config := RegistryConfig{
				Name: strings.ToLower(suffix),
				URL:  value,
			}

			// Look for matching auth (REGISTRY_AUTH_SUFFIX)
			authKey := "REGISTRY_AUTH_" + suffix
			if auth := os.Getenv(authKey); auth != "" {
				username, password, err := decodeAuth(auth)
				if err != nil {
					return nil, fmt.Errorf("failed to decode %s: %w", authKey, err)
				}
				config.Username = username
				config.Password = password
			}

			configs = append(configs, config)
		}
	}

	return configs, nil
}

// decodeAuth decodes base64-encoded "username:password" string
func decodeAuth(encoded string) (username, password string, err error) {
	decoded, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return "", "", fmt.Errorf("invalid base64: %w", err)
	}

	// Split at first ':'
	parts := strings.SplitN(string(decoded), ":", 2)
	if len(parts) != 2 {
		return "", "", fmt.Errorf("invalid auth format (expected username:password)")
	}

	return parts[0], parts[1], nil
}
