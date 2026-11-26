// Command basics loads data/basics.json into the products table, with each basic's PNG from the folder named by
// -images. It runs inside the API container, like cmd/sync, so it reads the same environment the server does. Run it
// from the backend directory, where data/basics.json lives.
package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"birdie-and-claire/internal/config"
	"birdie-and-claire/internal/database"
	"birdie-and-claire/internal/embedder"
	"birdie-and-claire/internal/log"
	"birdie-and-claire/internal/repository"
	"birdie-and-claire/internal/services"
	"birdie-and-claire/internal/storage"
)

const basicsFile = "data/basics.json"

func main() {
	if err := run(); err != nil {
		_, _ = fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func run() error {
	imagesDir := flag.String("images", "", "folder holding each basic's PNG")
	flag.Parse()
	if *imagesDir == "" {
		return fmt.Errorf("usage: basics -images <folder>")
	}

	data, err := os.ReadFile(basicsFile)
	if err != nil {
		return fmt.Errorf("read %s: %w", basicsFile, err)
	}
	basics, err := services.ParseBasics(data)
	if err != nil {
		return err
	}

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

	store, err := storage.New(ctx, cfg.Storage)
	if err != nil {
		return err
	}
	loader := services.NewBasicsLoaderService(repository.New(db), store, embedder.New(cfg.Embedder))
	return loader.Load(ctx, basics, os.DirFS(*imagesDir))
}
