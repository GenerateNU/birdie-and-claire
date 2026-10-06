package routers

import (
	"net/http"

	"birdie-and-claire/internal/controllers"
	"birdie-and-claire/internal/services"
	"birdie-and-claire/internal/types"

	"github.com/danielgtaylor/huma/v2"
)

func OutfitRoutes(api huma.API, params types.RouteParams) {
	service := services.NewOutfitService(params.ServiceParams.Repository)
	controller := controllers.NewOutfitController(service)

	huma.Register(api, huma.Operation{
		OperationID:   "create-outfit",
		Method:        http.MethodPost,
		Path:          "/api/v1/outfits",
		DefaultStatus: http.StatusCreated,
		Summary:       "Create an outfit",
		Tags:          []string{"outfits"},
	}, controller.Create)

	huma.Register(api, huma.Operation{
		OperationID: "get-outfit",
		Method:      http.MethodGet,
		Path:        "/api/v1/outfits/{id}",
		Summary:     "Get an outfit with its products",
		Tags:        []string{"outfits"},
	}, controller.Get)

	huma.Register(api, huma.Operation{
		OperationID: "list-outfits",
		Method:      http.MethodPost,
		Path:        "/api/v1/outfits/list",
		Summary:     "List the authenticated user's outfits",
		Tags:        []string{"outfits"},
	}, controller.List)
}
