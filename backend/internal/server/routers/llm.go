package routers

import (
	"net/http"

	"birdie-and-claire/internal/controllers"
	"birdie-and-claire/internal/types"

	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/sse"
)

func LLMRoutes(api huma.API, params types.RouteParams) {
	// any signed-in user could spend the gateway key; Hidden also keeps the routes out of /docs when the flag is on
	if !params.ServiceParams.Config.LLM.DevEndpoints {
		return
	}
	controller := controllers.NewLLMController(params.ServiceParams.LLM)

	huma.Register(api, huma.Operation{
		OperationID: "llm-generate",
		Method:      http.MethodPost,
		Path:        "/api/v1/llm/generate",
		Summary:     "Generate text (dev only)",
		Tags:        []string{"llm"},
		Hidden:      true,
	}, controller.Generate)

	huma.Register(api, huma.Operation{
		OperationID: "llm-generate-structured",
		Method:      http.MethodPost,
		Path:        "/api/v1/llm/generate/structured",
		Summary:     "Generate a fixed demo schema (dev only)",
		Tags:        []string{"llm"},
		Hidden:      true,
	}, controller.GenerateStructured)

	sse.Register(api, huma.Operation{
		OperationID: "llm-stream",
		Method:      http.MethodPost,
		Path:        "/api/v1/llm/stream",
		Summary:     "Stream generated text (dev only)",
		Tags:        []string{"llm"},
		Hidden:      true,
	}, map[string]any{
		"chunk": controllers.LLMStreamChunk{},
		"done":  controllers.LLMStreamDone{},
		"error": controllers.LLMStreamError{},
	}, controller.Stream)
}
