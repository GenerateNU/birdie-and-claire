package routers

import (
	"net/http"

	"birdie-and-claire/internal/controllers"
	"birdie-and-claire/internal/services"
	"birdie-and-claire/internal/types"

	"github.com/danielgtaylor/huma/v2"
)

func RecommendationRoutes(api huma.API, params types.RouteParams) {
	service := services.NewRecommendationService(
		params.ServiceParams.Repository,
		params.ServiceParams.LLM,
		params.ServiceParams.Embedder,
	)
	controller := controllers.NewRecommendationController(service)

	huma.Register(api, huma.Operation{
		OperationID: "recommend-products",
		Method:      http.MethodPost,
		Path:        "/api/v1/recommend",
		Summary:     "Recommend products per outfit slot for a shopper query",
		Tags:        []string{"recommendations"},
	}, controller.RecommendProducts)
}
