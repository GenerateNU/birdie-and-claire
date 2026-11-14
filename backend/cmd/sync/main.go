// Command sync runs the catalog sync once. It runs inside the API container,
// like cmd/migrate, so it reads the same environment the server does.
package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"birdie-and-claire/internal/config"
	"birdie-and-claire/internal/database"
	"birdie-and-claire/internal/embedder"
	"birdie-and-claire/internal/llm"
	"birdie-and-claire/internal/log"
	"birdie-and-claire/internal/repository"
	"birdie-and-claire/internal/services"
	"birdie-and-claire/internal/shopify"
)

func main() {
	if err := run(); err != nil {
		_, _ = fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}
	log.Install(cfg.App.LogFormat)

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	db, err := database.Open(ctx, cfg.Database)
	if err != nil {
		return err
	}
	defer func() { _ = db.Close() }()

	catalogSync := services.NewCatalogSyncService(repository.New(db), shopify.New(cfg.Shopify), embedder.New(cfg.Embedder), llm.New(ctx, cfg.LLM))
	return catalogSync.Sync(ctx)
}
