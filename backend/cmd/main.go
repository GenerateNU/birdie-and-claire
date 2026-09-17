// Command main runs the HTTP API.
package main

import (
	"context"
	"errors"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"example_project/internal/config"
	"example_project/internal/database"
	"example_project/internal/log"
	"example_project/internal/server"
)

const shutdownTimeout = 10 * time.Second

func main() {
	if err := run(); err != nil {
		slog.Error("startup failed", "error", err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}

	logger := log.Install(cfg.App.LogFormat)

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	db, err := database.Open(ctx, cfg.Database)
	if err != nil {
		return err
	}
	defer func() { _ = db.Close() }()

	if err := database.Verify(ctx, db); err != nil {
		return err
	}

	app, _ := server.New(cfg, db)

	serverErr := make(chan error, 1)
	go func() {
		// In text mode Fiber's banner announces the address instead.
		if cfg.App.LogFormat == config.LogFormatJSON {
			logger.Info("server started", "address", cfg.App.Address())
		}
		serverErr <- app.Listen(cfg.App.Address(), server.ListenConfig(cfg))
	}()

	select {
	case err := <-serverErr:
		if err != nil && !errors.Is(err, context.Canceled) {
			return err
		}
	case <-ctx.Done():
		logger.Info("shutting down")
		if err := app.ShutdownWithTimeout(shutdownTimeout); err != nil {
			return err
		}
	}

	logger.Info("server stopped")
	return nil
}
