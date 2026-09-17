package database

import (
	"context"
	"database/sql"
	"embed"
	"errors"
	"fmt"
	"math"

	"github.com/pressly/goose/v3"
)

// migrationsDir is the path inside migrationFS, not on disk. Migrations are
// embedded so a deployed binary carries its own schema history and needs
// neither the .sql files nor the goose CLI.
const migrationsDir = "migrations"

// maxVersion collects every migration above the current one.
const maxVersion = int64(math.MaxInt64)

//go:embed migrations/*.sql
var migrationFS embed.FS

func init() {
	goose.SetBaseFS(migrationFS)
	if err := goose.SetDialect("postgres"); err != nil {
		panic(fmt.Errorf("set goose dialect: %w", err))
	}
}

// Verify never applies anything. The server calls it at startup and refuses to
// serve on a stale schema; migrating stays a deliberate action via mise.
func Verify(ctx context.Context, database *sql.DB) error {
	current, err := goose.GetDBVersionContext(ctx, database)
	if err != nil {
		return fmt.Errorf("read schema version: %w", err)
	}

	// CollectMigrations reports the migrations in (current, maxVersion]. When
	// the schema is current that range is empty, which goose signals with
	// ErrNoMigrationFiles rather than an empty slice.
	pending, err := goose.CollectMigrations(migrationsDir, current, maxVersion)
	if errors.Is(err, goose.ErrNoMigrationFiles) {
		return nil
	}
	if err != nil {
		return fmt.Errorf("collect migrations: %w", err)
	}
	if len(pending) > 0 {
		return fmt.Errorf(
			"database schema is %d migrations behind (at version %d); run mise run db:dev:migrate:up",
			len(pending), current,
		)
	}
	return nil
}

func Up(ctx context.Context, database *sql.DB) error {
	return goose.UpContext(ctx, database, migrationsDir)
}

func Down(ctx context.Context, database *sql.DB) error {
	return goose.DownContext(ctx, database, migrationsDir)
}

func Status(ctx context.Context, database *sql.DB) error {
	return goose.StatusContext(ctx, database, migrationsDir)
}
