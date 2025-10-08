package main

import (
	"log/slog"
	"os"
)

func createLogger(lvl slog.Level) *slog.Logger {
	opts := &slog.HandlerOptions{Level: lvl}
	handler := slog.NewTextHandler(os.Stdout, opts)

	return slog.New(handler)
}
