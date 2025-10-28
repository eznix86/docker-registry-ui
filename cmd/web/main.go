// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025  Bruno Bernard
//
// This file is part of Docker Registry UI (Container Hub).
//
// Docker Registry UI is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
//
// Docker Registry UI is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.

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
