package main

import (
	"fmt"
	"os"

	"github.com/eznix86/docker-registry-ui/internal/app"
)

func main() {
	if err := app.Run(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
