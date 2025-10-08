package ui

import (
	"embed"
	"encoding/json"
	"fmt"
	"io/fs"
)

//go:embed views/app.html
var buildHtml []byte

func BuildHtml() []byte {
	return buildHtml[:]
}

//go:embed build
var build embed.FS

func Assets() fs.FS {
	assets, err := fs.Sub(build, "build/assets")
	if err != nil {
		panic(fmt.Errorf("failed to get subdirectory %q: %w", "build/assets", err))
	}

	return assets
}

//go:embed build/manifest.json
var manifest []byte

type manitestData map[string]struct {
	File string `json:"file"`
}

func Manifest() func(name string) (string, error) {
	var data manitestData
	err := json.Unmarshal(manifest, &data)
	if err != nil {
		panic(fmt.Errorf("failed to unmarshal manifest: %w", err))
	}

	return func(name string) (string, error) {
		entry, ok := data[name]
		if !ok {
			return "", fmt.Errorf("entry %q not found in manifest", name)
		}

		return "/" + entry.File, nil
	}
}
