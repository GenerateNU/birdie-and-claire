package routers

import (
	"net/http"

	"birdie-and-claire/internal/controllers"
	"birdie-and-claire/internal/types"

	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/sse"
)

// LLMRoutes spend the gateway key, so every route is gated on AI_DEV_USER_IDS and hidden from the docs.
func LLMRoutes(api huma.API, params types.RouteParams) {
	controller := controllers.NewLLMController(params.ServiceParams.LLM, params.ServiceParams.Config.LLM.DevUserIDs)
	testersOnly := huma.Middlewares{controller.RequireTester(api)}

	huma.Register(api, huma.Operation{
		OperationID: "llm-generate",
		Method:      http.MethodPost,
		Path:        "/api/v1/llm/generate",
		Summary:     "Generate text (dev only)",
		Tags:        []string{"llm"},
		Hidden:      true,
		Middlewares: testersOnly,
	}, controller.Generate)

	huma.Register(api, huma.Operation{
		OperationID: "llm-generate-structured",
		Method:      http.MethodPost,
		Path:        "/api/v1/llm/generate/structured",
		Summary:     "Generate a fixed demo schema (dev only)",
		Tags:        []string{"llm"},
		Hidden:      true,
		Middlewares: testersOnly,
	}, controller.GenerateStructured)

	sse.Register(api, huma.Operation{
		OperationID: "llm-stream",
		Method:      http.MethodPost,
		Path:        "/api/v1/llm/stream",
		Summary:     "Stream generated text (dev only)",
		Tags:        []string{"llm"},
		Hidden:      true,
		Middlewares: testersOnly,
	}, map[string]any{
		"chunk": controllers.LLMStreamChunk{},
		"done":  controllers.LLMStreamDone{},
		"error": controllers.LLMStreamError{},
	}, controller.Stream)
}
