// Package server builds the HTTP application and wires every layer together.
package server

import (
	"database/sql"

	"example_project/internal/config"
	"example_project/internal/repository"
	"example_project/internal/server/middlewares"
	"example_project/internal/server/routers"
	"example_project/internal/types"

	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/adapters/humafiber"
	"github.com/gofiber/fiber/v3"
)

// New returns the huma.API alongside the app because cmd/openapi renders the
// tracked spec from it.
func New(cfg *config.Configuration, database *sql.DB) (*fiber.App, huma.API) {
	app := fiber.New(fiber.Config{
		ServerHeader: cfg.App.Name,
		AppName:      cfg.App.Name,
	})

	middlewares.Setup(app)

	api := humafiber.New(app, apiConfig(cfg))
	routers.Setup(api, types.RouteParams{
		ServiceParams: &types.ServiceParams{
			Repository: repository.New(database),
			Config:     cfg,
		},
	})

	return app, api
}

// ListenConfig keeps Fiber's startup banner in development but suppresses it
// under JSON logging, where it would put six non-JSON lines into a stream an
// aggregator has to parse.
func ListenConfig(cfg *config.Configuration) fiber.ListenConfig {
	return fiber.ListenConfig{
		DisableStartupMessage: cfg.App.LogFormat == config.LogFormatJSON,
	}
}

// Spec builds the API for cmd/openapi. No handler runs, so the nil database
// is never read.
func Spec(cfg *config.Configuration) huma.API {
	api := humafiber.New(fiber.New(), apiConfig(cfg))
	routers.Setup(api, types.RouteParams{
		ServiceParams: &types.ServiceParams{
			Repository: repository.New(nil),
			Config:     cfg,
		},
	})
	return api
}

func apiConfig(cfg *config.Configuration) huma.Config {
	humaConfig := huma.DefaultConfig(cfg.App.Name, "1.0.0")
	humaConfig.DocsPath = "/docs"
	humaConfig.DocsRenderer = huma.DocsRendererScalar
	return humaConfig
}
