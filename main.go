// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

package main

import (
	"embed"
	"fmt"
	"log"

	"github.com/spf13/cobra"
)

//go:embed all:public resources/views/app.html
var publicFS embed.FS

//go:embed database/migrations/*.sql
var migrationsFS embed.FS

var (
	Version        = "dev"
	CommitHash     = "n/a"
	BuildTimestamp = "n/a"
)

func BuildVersion() string {
	return fmt.Sprintf("%s-%s (%s)", Version, CommitHash, BuildTimestamp)
}

var rootCmd = &cobra.Command{
	Use:   "register-ui",
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
	rootCmd.AddCommand(seedCmd)
}

func main() {
	if err := rootCmd.Execute(); err != nil {
		log.Fatal(err)
	}
}
