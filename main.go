package main

import (
	"errors"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/eznix86/docker-registry-ui/explorer"
	"github.com/eznix86/docker-registry-ui/explorer/inertia"
	"github.com/spf13/cobra"
)

const appName = "docker-registry-ui"

var (
	buildVersion = "v0.0"
	buildBranch  = "unknown"
	buildSHA     = "unknown"
	buildDate    = "unknown"
)

func main() {
	logger := createLogger(slog.LevelDebug)

	rootCmd := cobra.Command{
		Use: appName,
	}

	cmdServe := &cobra.Command{
		Use:   "serve",
		Short: "Start the explorer server",
		RunE:  serveCommand(logger, "127.0.0.1", 1337, false),
	}

	cmdDev := &cobra.Command{
		Use:   "dev",
		Short: "Start the explorer server in development mode",
		RunE:  serveCommand(logger, "127.0.0.1", 1337, true),
	}

	rootCmd.AddCommand(
		cmdServe,
		cmdDev,
		versionCommand(logger, appName, buildVersion, buildBranch, buildSHA, buildDate),
	)

	if err := rootCmd.Execute(); err != nil {
		fmt.Printf("An error occurred: %s", err)
	}
}

func versionCommand(logger *slog.Logger, name, version, branch, sha, date string) *cobra.Command {
	return &cobra.Command{
		Use:   "version",
		Short: "Print the version number of " + name,
		Run: func(cmd *cobra.Command, args []string) {
			logger.Info(
				"name",
				slog.String("version", version),
				slog.String("branch", branch),
				slog.String("sha", sha),
				slog.String("date", date),
			)
		},
	}
}

func serveCommand(logger *slog.Logger, hostname string, port int, dev bool) func(cmd *cobra.Command, args []string) error {
	return func(cmd *cobra.Command, args []string) error {
		var (
			exp            explorer.Fake
			exploreHandler http.Handler
		)

		if dev {
			exploreHandler = inertia.Dev(logger, &exp)
		} else {
			exploreHandler = inertia.New(logger, &exp)
		}

		logger.Info("starting server", slog.String("hostname", hostname), slog.Int("port", port))
		addr := fmt.Sprintf("%s:%d", hostname, port)

		err := http.ListenAndServe(addr, exploreHandler)
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("server error", slog.String("error", err.Error()))
			return err
		}

		logger.Info("server stopped")

		return nil
	}
}
