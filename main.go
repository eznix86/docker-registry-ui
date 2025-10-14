// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

package main

import (
	"embed"
	"fmt"
	"net/http"
	"time"

	"github.com/eznix86/docker-registry-ui/internal/routes"
)

//go:embed public/* resources/views/app.html
var publicFS embed.FS

var (
	Version        = "dev"
	CommitHash     = "n/a"
	BuildTimestamp = "n/a"
)

func BuildVersion() string {
	return fmt.Sprintf("%s-%s (%s)", Version, CommitHash, BuildTimestamp)
}

func main() {
	fmt.Println(BuildVersion())
	r := routes.NewRouter(publicFS)
	fmt.Println("Starting server on port http://localhost:3000/")

	server := &http.Server{
		Addr:              ":3000",
		Handler:           r,
		ReadHeaderTimeout: 5 * time.Second,
	}

	if err := server.ListenAndServe(); err != nil {
		fmt.Printf("Server failed: %v\n", err)
	}
}
