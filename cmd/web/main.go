// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

package main

import (
	"fmt"
	"log"

	seed "github.com/eznix86/docker-registry-ui/cmd/cli"
	"github.com/spf13/cobra"
)

var (
	Version        = "dev"
	CommitHash     = "n/a"
	BuildTimestamp = "n/a"
)

func BuildVersion() string {
	return fmt.Sprintf("%s-%s (%s)", Version, CommitHash, BuildTimestamp)
}

var rootCmd = &cobra.Command{
	Use:   "ui",
	Short: "Docker Registry UI",
	Long:  `A beautiful web interface for managing Docker registries.`,
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println(BuildVersion())
		err := cmd.Help()
		if err != nil {
			log.Fatal("failed to show help")
		}
	},
}

func init() {
	rootCmd.AddCommand(serveCmd)
	rootCmd.AddCommand(seed.SeedCmd)
}

func main() {
	if err := rootCmd.Execute(); err != nil {
		log.Fatal(err)
	}
}
