// Package server builds the HTTP application and wires every layer together.
package server

import (
	"database/sql"
	jsonv2 "encoding/json/v2"
	"strings"

	"birdie-and-claire/internal/auth"
	"birdie-and-claire/internal/config"
	"birdie-and-claire/internal/embedder"
	"birdie-and-claire/internal/llm"
	"birdie-and-claire/internal/models"
	"birdie-and-claire/internal/repository"
	"birdie-and-claire/internal/server/middlewares"
	"birdie-and-claire/internal/server/routers"
	"birdie-and-claire/internal/storage"
	"birdie-and-claire/internal/types"

	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/adapters/humafiber"
	"github.com/gofiber/fiber/v3"
)

// New returns the huma.API alongside the app because cmd/openapi renders the
// tracked spec from it.
func New(cfg *config.Configuration, database *sql.DB, store storage.ObjectStore, emb embedder.Embedder, llmClient llm.Client, verifier *auth.Verifier) (*fiber.App, huma.API) {
	app := fiber.New(fiber.Config{
		ServerHeader: cfg.App.Name,
		AppName:      cfg.App.Name,
	})

	middlewares.Setup(app, verifier)

	api := humafiber.New(app, APIConfig(cfg))
	routers.Setup(api, types.RouteParams{
		ServiceParams: &types.ServiceParams{
			Repository: repository.New(database),
			Config:     cfg,
			Storage:    store,
			Embedder:   emb,
			LLM:        llmClient,
		},
		Verifier: verifier,
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

// Spec builds the API for cmd/openapi. No handler runs, so the nil database,
// store, embedder, LLM client, and verifier are never read.
func Spec(cfg *config.Configuration) huma.API {
	api := humafiber.New(fiber.New(), APIConfig(cfg))
	routers.Setup(api, types.RouteParams{
		ServiceParams: &types.ServiceParams{
			Repository: repository.New(nil),
			Config:     cfg,
			Storage:    nil,
			Embedder:   nil,
			LLM:        nil,
		},
	})
	return api
}

const bearerScheme = "bearer"

// APIConfig is the huma configuration the server, the spec generator, and the tests share.
func APIConfig(cfg *config.Configuration) huma.Config {
	humaConfig := huma.DefaultConfig(cfg.App.Name, "1.0.0")
	humaConfig.DocsPath = "/docs"
	humaConfig.DocsRenderer = huma.DocsRendererScalar

	// v1 encoding/json folds key case and keeps the last duplicate, so a handler could receive a value huma never validated.
	jsonFormat := huma.DefaultJSONFormat
	jsonFormat.Unmarshal = func(data []byte, v any) error { return jsonv2.Unmarshal(data, v) }
	// DefaultFormats is a package-level map, so replace it instead of writing into it.
	humaConfig.Formats = map[string]huma.Format{"application/json": jsonFormat, "json": jsonFormat}

	// DefaultConfig's only create hook installs huma's schema-link transformer,
	// which adds a $schema field and a Link header to every response. The
	// humafiber adapter reports the host without its port, so both came out
	// pointing at the wrong URL. Dropping the hook drops the feature.
	humaConfig.CreateHooks = nil

	// The auth middleware guards /api/v1 by path, so mark the same routes in the
	// spec: the docs then show a lock and can send a token.
	humaConfig.Components.SecuritySchemes = map[string]*huma.SecurityScheme{
		bearerScheme: {Type: "http", Scheme: "bearer", BearerFormat: "JWT"},
	}
	humaConfig.OnAddOperation = append(humaConfig.OnAddOperation, func(_ *huma.OpenAPI, op *huma.Operation) {
		if strings.HasPrefix(op.Path, "/api/v1/") {
			op.Security = []map[string][]string{{bearerScheme: {}}}
		}
	})

	models.RegisterRecommendationEnums(humaConfig.Components.Schemas)

	return humaConfig
}
