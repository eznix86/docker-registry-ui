// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

package main

import (
	"fmt"
	"net/http"

	"github.com/eznix86/docker-registry-ui/internal/routes"
)

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
	r := routes.NewRouter()
	fmt.Println("Starting server on port http://localhost:3000/")
	http.ListenAndServe(":3000", r)
}
