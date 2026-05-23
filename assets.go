package assets

import (
	"embed"
	"io/fs"
)

//go:embed all:public resources/views/app.html
var PublicFS embed.FS

func LoadPublicEmbed() (fs.FS, error) {
	publicSubFS, err := fs.Sub(PublicFS, "public")

	if err != nil {
		return nil, err
	}

	return publicSubFS, nil
}
