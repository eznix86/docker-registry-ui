package models

import (
	"encoding/base64"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/eznix86/docker-registry-ui/backend/internal/helpers/http"
	"github.com/eznix86/docker-registry-ui/backend/internal/presenters"
	"gorm.io/gorm"
)

type Registry struct {
	ID             uint
	Name           string
	URL            string
	Host           string // domain:port extracted from URL
	HttpStatusCode int    `json:"http_status_code" gorm:"default:-1"` // -1 = not attempted, 200 = OK, others = error
	LastScrapedAt  *time.Time
}

func (r Registry) ToPresenter() *presenters.SourceView {
	return &presenters.SourceView{
		Key:    r.Name,
		Host:   r.Host,
		Status: r.HttpStatusCode,
	}
}

// RegistryConfig holds runtime configuration for a registry
type RegistryConfig struct {
	Name      string
	URL       string
	Host      string
	AuthToken string // Optional - loaded from env at runtime
}

type RegistryBasicAuth struct {
	Username string
	Password string
}

// GetAuthToken returns the auth token for this registry from environment variables
func (r *Registry) GetAuthToken() string {
	if r.Name == "default" {
		return os.Getenv("REGISTRY_AUTH")
	}
	return os.Getenv("REGISTRY_AUTH_" + strings.ToUpper(r.Name))
}

func (r *Registry) GetBasicAuth() *RegistryBasicAuth {
	authToken := r.GetAuthToken()
	if authToken != "" {
		decoded, err := base64.StdEncoding.DecodeString(authToken)
		if err == nil {
			parts := strings.SplitN(string(decoded), ":", 2)
			if len(parts) == 2 {
				return &RegistryBasicAuth{
					Username: parts[0],
					Password: parts[1],
				}
			}
		}
	}
	return nil
}

func (r *Registry) GetClient() *http.RegistryClient {
	auth := r.GetBasicAuth()

	if auth == nil {
		return http.NewRegistryClient(r.URL, "", "")
	}

	return http.NewRegistryClient(r.URL, auth.Username, auth.Password)
}

// extractHost extracts host:port from URL
func extractHost(rawURL string) (string, error) {
	u, err := url.Parse(rawURL)
	if err != nil {
		return "", err
	}
	return u.Host, nil
}

// LoadRegistriesFromEnv loads registry configurations from environment variables
func LoadRegistriesFromEnv() []RegistryConfig {
	var configs []RegistryConfig

	// Load default registry (no suffix)
	if rawURL := os.Getenv("REGISTRY_URL"); rawURL != "" {
		host, err := extractHost(rawURL)
		if err == nil {
			configs = append(configs, RegistryConfig{
				Name:      "default",
				URL:       rawURL,
				Host:      host,
				AuthToken: os.Getenv("REGISTRY_AUTH"), // Optional
			})
		}
	}

	// Load suffixed registries
	for _, env := range os.Environ() {
		if strings.HasPrefix(env, "REGISTRY_URL_") {
			parts := strings.SplitN(env, "=", 2)
			if len(parts) != 2 {
				continue
			}

			// Extract suffix from REGISTRY_URL_SUFFIX
			envKey := parts[0]
			suffix := strings.TrimPrefix(envKey, "REGISTRY_URL_")
			if suffix == "" {
				continue
			}

			rawURL := parts[1]
			host, err := extractHost(rawURL)
			if err != nil {
				continue
			}

			authKey := "REGISTRY_AUTH_" + suffix
			authToken := os.Getenv(authKey) // Optional

			configs = append(configs, RegistryConfig{
				Name:      strings.ToLower(suffix),
				URL:       rawURL,
				Host:      host,
				AuthToken: authToken,
			})
		}
	}

	return configs
}

func SyncRegistries(db *gorm.DB, configs []RegistryConfig) {
	db.Transaction(func(tx *gorm.DB) error {
		for _, config := range configs {
			registry := Registry{
				Name: config.Name,
				URL:  config.URL,
				Host: config.Host,
			}

			db.Where(Registry{Host: config.Host}).FirstOrCreate(&registry)
		}
		return nil
	})
}

func (r *Registry) GetStatus() int {
	return r.GetClient().CheckHealth()
}
