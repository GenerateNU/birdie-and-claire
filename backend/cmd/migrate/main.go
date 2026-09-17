// Command migrate applies, rolls back, or reports the embedded migrations.
// It runs inside the API container, which is why it reads the same
// DATABASE_URL the server does rather than taking a connection string.
package main

import (
	"context"
	"errors"
	"fmt"
	"os"

	"example_project/internal/config"
	"example_project/internal/database"
)

func main() {
	if err := run(); err != nil {
		_, _ = fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func run() error {
	if len(os.Args) != 2 {
		return errors.New("usage: migrate <up|down|status>")
	}

	cfg, err := config.Load()
	if err != nil {
		return err
	}

	ctx := context.Background()
	db, err := database.Open(ctx, cfg.Database)
	if err != nil {
		return err
	}
	defer func() { _ = db.Close() }()

	switch action := os.Args[1]; action {
	case "up":
		return database.Up(ctx, db)
	case "down":
		return database.Down(ctx, db)
	case "status":
		return database.Status(ctx, db)
	default:
		return fmt.Errorf("unknown action %q", action)
	}
}
