package utils

import (
	"log"
	"os"
	"os/signal"
	"syscall"
)

// GracefulShutdown sets up a signal handler for graceful shutdown.
func GracefulShutdown(cleanups ...func() error) {
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-c
		log.Println("Shutting down gracefully...")

		for i, cleanup := range cleanups {
			if err := cleanup(); err != nil {
				log.Printf("Cleanup #%d error: %v", i+1, err)
			}
		}

		os.Exit(0)
	}()
}