package routers

import (
	"net/http"

	"example_project/internal/controllers"
	"example_project/internal/types"

	"github.com/danielgtaylor/huma/v2"
)

func HealthRoutes(api huma.API, params types.RouteParams) {
	controller := controllers.NewHealthController(params.ServiceParams.Config.Supabase, params.Verifier, params.ServiceParams.Embedder)

	huma.Register(api, huma.Operation{
		OperationID: "health",
		Method:      http.MethodGet,
		Path:        "/health",
		Summary:     "Liveness probe",
		Description: "Reports only that the process is running. Never checks dependencies, because a failing liveness probe gets the process killed.",
		Tags:        []string{"meta"},
	}, controller.Liveness)

	huma.Register(api, huma.Operation{
		OperationID: "health-supabase",
		Method:      http.MethodGet,
		Path:        "/health/supabase",
		Summary:     "Supabase reachability check",
		Description: "Fetches the Supabase project's public JWKS document and returns it. Separate from /health because a liveness probe must not fail on a dependency.",
		Tags:        []string{"meta"},
	}, controller.Supabase)

	huma.Register(api, huma.Operation{
		OperationID: "health-auth",
		Method:      http.MethodGet,
		Path:        "/health/auth",
		Summary:     "Token verifier status",
		Description: "Reports whether Supabase's signing keys are loaded. While keys_loaded is false, every /api/v1 request is rejected. Always 200, so it informs without failing a probe.",
		Tags:        []string{"meta"},
	}, controller.Auth)

	huma.Register(api, huma.Operation{
		OperationID: "health-embedder",
		Method:      http.MethodGet,
		Path:        "/health/embedder",
		Summary:     "Warm the embedding service",
		Description: "Calls the Modal embedder's /warm and reports how long it took: tens of seconds on a cold start, well under one when a container is already up. Modal keeps the container warm for about 60 seconds. Separate from /health because a liveness probe must not fail on a dependency.",
		Tags:        []string{"meta"},
	}, controller.Embedder)
}
