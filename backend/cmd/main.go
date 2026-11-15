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

	"birdie-and-claire/internal/auth"
	"birdie-and-claire/internal/config"
	"birdie-and-claire/internal/database"
	"birdie-and-claire/internal/embedder"
	"birdie-and-claire/internal/llm"
	"birdie-and-claire/internal/log"
	"birdie-and-claire/internal/repository"
	"birdie-and-claire/internal/server"
	"birdie-and-claire/internal/services"
	"birdie-and-claire/internal/shopify"
	"birdie-and-claire/internal/storage"
)

const (
	shutdownTimeout     = 10 * time.Second
	catalogSyncInterval = 24 * time.Hour
)

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

	store, err := storage.New(ctx, cfg.Storage)
	if err != nil {
		return err
	}
	if err := store.HeadBucket(ctx); err != nil {
		return err
	}

	// ctx stops the background key refresh on shutdown.
	verifier, err := auth.NewVerifier(ctx, cfg.Supabase)
	if err != nil {
		return err
	}

	emb := embedder.New(cfg.Embedder)
	llmClient := llm.New(ctx, cfg.LLM)
	log.Debug(ctx, "llm client ready", "model", cfg.LLM.Model)

	app, _ := server.New(cfg, db, store, emb, llmClient, verifier)

	catalogSync := services.NewCatalogSyncService(repository.New(db), shopify.New(cfg.Shopify), emb, llmClient)
	syncDone := make(chan struct{})
	go func() {
		defer close(syncDone)
		syncCatalog(ctx, catalogSync)
	}()
	// Runs before the deferred db.Close, so a sync in progress never queries a
	// closed database. stop cancels ctx, which ends the sync even when the
	// server failed on its own and no signal arrived.
	defer func() {
		stop()
		<-syncDone
	}()

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

// syncCatalog syncs at startup and then every catalogSyncInterval until ctx
// ends. One goroutine runs every sync, so two never overlap, and the ticker
// drops ticks that arrive while one is running.
func syncCatalog(ctx context.Context, catalogSync services.CatalogSyncService) {
	ticker := time.NewTicker(catalogSyncInterval)
	defer ticker.Stop()

	for {
		// A sync cut off by shutdown fails with ctx's error, which is not a
		// failure worth logging.
		if err := catalogSync.Sync(ctx); err != nil && ctx.Err() == nil {
			log.Error(ctx, "catalog sync failed", "error", err)
		}

		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
	}
}
