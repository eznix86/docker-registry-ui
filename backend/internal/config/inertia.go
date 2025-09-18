package config

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path"
	"strings"

	inertia "github.com/romsar/gonertia/v2"
)

const (
	viteHotFile          = "public/hot"
	rootTemplateFile     = "resources/views/root.html"
	buildManifestPath    = "public/build/manifest.json"
	fallbackManifestPath = "public/build/.vite/manifest.json"
	buildDirectory       = "/build/"
	defaultDevPort       = "//localhost:5173"
)

type ViteAsset struct {
	File string `json:"file"`
	Src  string `json:"src"`
}

func NewInertia() (*inertia.Inertia, error) {
	if isViteDevMode() {
		log.Print("Dev mode detected...")
		return createDevModeInertia()
	}
	log.Print("Production mode detected...")
	return createProductionInertia()
}

func isViteDevMode() bool {
	_, err := os.Stat(viteHotFile)
	return err == nil
}

func createDevModeInertia() (*inertia.Inertia, error) {
	i, err := inertia.NewFromFile(rootTemplateFile)
	if err != nil {
		return nil, fmt.Errorf("failed to create dev Inertia instance: %w", err)
	}

	i.ShareTemplateFunc("vite", createDevViteAssetResolver())
	i.ShareTemplateData("hmr", true)

	return i, nil
}

func createProductionInertia() (*inertia.Inertia, error) {
	manifestPath, err := ensureManifestExists()
	if err != nil {
		return nil, err
	}

	i, err := inertia.NewFromFile(
		rootTemplateFile,
		inertia.WithVersionFromFile(manifestPath),
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create production Inertia instance: %w", err)
	}

	i.ShareTemplateFunc("vite", createProdViteAssetResolver(manifestPath))
	i.ShareTemplateData("hmr", false)
	return i, nil
}

func ensureManifestExists() (string, error) {
	if _, err := os.Stat(buildManifestPath); err == nil {
		return buildManifestPath, nil
	}

	if _, err := os.Stat(fallbackManifestPath); err == nil {
		if moveErr := os.Rename(fallbackManifestPath, buildManifestPath); moveErr != nil {
			return "", fmt.Errorf("failed to move manifest from %s to %s: %w",
				fallbackManifestPath, buildManifestPath, moveErr)
		}
		return buildManifestPath, nil
	}

	return "", fmt.Errorf("manifest file not found at %s or %s",
		buildManifestPath, fallbackManifestPath)
}

func createDevViteAssetResolver() func(string) (string, error) {
	return func(entry string) (string, error) {
		devServerURL, err := readDevServerURL()
		if err != nil {
			return "", err
		}

		if entry != "" && !strings.HasPrefix(entry, "/") {
			entry = "/" + entry
		}

		return devServerURL + entry, nil
	}
}

func readDevServerURL() (string, error) {
	content, err := os.ReadFile(viteHotFile)
	if err != nil {
		return "", fmt.Errorf("failed to read Vite hot file: %w", err)
	}

	url := strings.TrimSpace(string(content))

	if strings.HasPrefix(url, "http://") || strings.HasPrefix(url, "https://") {
		if colonIndex := strings.LastIndex(url, ":"); colonIndex != -1 {
			url = url[strings.Index(url, ":")+1:]
		}
	} else {
		url = defaultDevPort
	}

	return url, nil
}

func createProdViteAssetResolver(manifestPath string) func(string) (string, error) {
	manifest, err := loadViteManifest(manifestPath)
	if err != nil {
		log.Fatalf("Failed to load Vite manifest: %v", err)
	}

	return func(assetPath string) (string, error) {
		if asset, exists := manifest[assetPath]; exists {
			return path.Join(buildDirectory, asset.File), nil
		}
		return "", fmt.Errorf("asset %q not found in manifest", assetPath)
	}
}

func loadViteManifest(manifestPath string) (map[string]*ViteAsset, error) {
	file, err := os.Open(manifestPath)
	if err != nil {
		return nil, fmt.Errorf("cannot open Vite manifest file %s: %w", manifestPath, err)
	}
	defer file.Close()

	var manifest map[string]*ViteAsset
	if err := json.NewDecoder(file).Decode(&manifest); err != nil {
		return nil, fmt.Errorf("cannot decode Vite manifest: %w", err)
	}

	logManifestAssets(manifest)
	return manifest, nil
}

func logManifestAssets(manifest map[string]*ViteAsset) {
	log.Printf("Loaded Vite manifest with %d assets:", len(manifest))
	for source, asset := range manifest {
		log.Printf("  %s -> %s", source, asset.File)
	}
}
