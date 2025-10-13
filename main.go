// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

package main

import "fmt"


var (
	Version    = "dev"
	CommitHash = "n/a"
	BuildTimestamp  = "n/a"

)

func BuildVersion() string {
	return fmt.Sprintf("%s-%s (%s)", Version, CommitHash, BuildTimestamp)
}

func main() {
	fmt.Println(BuildVersion())
}
