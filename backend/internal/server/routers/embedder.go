package routers

import (
	"net/http"

	"birdie-and-claire/internal/controllers"
	"birdie-and-claire/internal/types"

	"github.com/danielgtaylor/huma/v2"
)

func EmbedderRoutes(api huma.API, params types.RouteParams) {
	controller := controllers.NewEmbedderController(params.ServiceParams.Embedder)

	huma.Register(api, huma.Operation{
		OperationID: "warm-embedder",
		Method:      http.MethodPost,
		Path:        "/api/v1/embedder/warm",
		Summary:     "Warm the embedding service",
		Description: "Boots a Modal container ahead of an embed call and reports how long it took: tens of seconds on a cold start, well under one when a container is already up. Modal keeps the container warm for about 60 seconds.",
		Tags:        []string{"embedder"},
	}, controller.Warm)
}
