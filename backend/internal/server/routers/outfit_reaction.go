package routers

import (
	"net/http"

	"birdie-and-claire/internal/controllers"
	"birdie-and-claire/internal/services"
	"birdie-and-claire/internal/types"

	"github.com/danielgtaylor/huma/v2"
)

func OutfitReactionRoutes(api huma.API, params types.RouteParams) {
	service := services.NewOutfitReactionService(params.ServiceParams.Repository)
	controller := controllers.NewOutfitReactionController(service)

	huma.Register(api, huma.Operation{
		OperationID: "create-outfit-reaction",
		Method:      http.MethodPost,
		Path:        "/api/v1/outfits/{id}/reactions",
		Summary:     "React to an outfit",
		Tags:        []string{"outfits"},
	}, controller.Create)

	huma.Register(api, huma.Operation{
		OperationID: "get-outfit-reaction-counts",
		Method:      http.MethodGet,
		Path:        "/api/v1/outfits/{id}/reactions",
		Summary:     "Get aggregate reaction counts for an outfit",
		Tags:        []string{"outfits"},
	}, controller.GetCounts)
}