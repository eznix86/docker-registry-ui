package app

import (
	"testing"
	"time"

	"github.com/spf13/pflag"
)

func TestApplyFlagOverrides(t *testing.T) {
	t.Helper()

	flags := pflag.NewFlagSet("test", pflag.ContinueOnError)
	flags.CountP("verbose", "v", "increase verbosity")
	flags.String("host", "localhost", "host")
	flags.String("database-url", "data/ui.db", "database url")
	flags.Int("workers", 20, "workers")
	flags.Duration("sync-interval", time.Hour, "sync interval")
	flags.Bool("show-sql", false, "show sql")

	if err := flags.Parse([]string{
		"-vv",
		"--host=0.0.0.0",
		"--database-url=/tmp/test.db",
		"--workers=42",
		"--sync-interval=30s",
		"--show-sql",
	}); err != nil {
		t.Fatalf("parse flags: %v", err)
	}

	cfg := &Config{}
	if err := applyFlagOverrides(flags, cfg); err != nil {
		t.Fatalf("apply flag overrides: %v", err)
	}

	if cfg.App.VerboseCount != 2 {
		t.Fatalf("expected verbose count 2, got %d", cfg.App.VerboseCount)
	}

	if cfg.Server.Host != "0.0.0.0" {
		t.Fatalf("expected host override, got %q", cfg.Server.Host)
	}

	if cfg.Database.URL != "/tmp/test.db" {
		t.Fatalf("expected database url override, got %q", cfg.Database.URL)
	}

	if cfg.Database.ShowSQL != true {
		t.Fatalf("expected show sql override, got %t", cfg.Database.ShowSQL)
	}

	if cfg.Scraper.Workers != 42 {
		t.Fatalf("expected workers override, got %d", cfg.Scraper.Workers)
	}

	if cfg.Scraper.SyncInterval != 30*time.Second {
		t.Fatalf("expected sync interval override, got %s", cfg.Scraper.SyncInterval)
	}
}
