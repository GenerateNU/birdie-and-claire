package routers

import (
	"net/http"

	"birdie-and-claire/internal/controllers"
	"birdie-and-claire/internal/services"
	"birdie-and-claire/internal/types"

	"github.com/danielgtaylor/huma/v2"
)

func OutfitRoutes(api huma.API, params types.RouteParams) {
	service := services.NewOutfitService(params.ServiceParams.Repository, params.ServiceParams.Config.App.PublicAPIURL)
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
		Summary:     "Get one of the authenticated user's outfits with its products",
		Tags:        []string{"outfits"},
	}, controller.Get)

	huma.Register(api, huma.Operation{
		OperationID: "list-outfits",
		Method:      http.MethodGet,
		Path:        "/api/v1/outfits",
		Summary:     "List the authenticated user's outfits",
		Tags:        []string{"outfits"},
	}, controller.List)

	huma.Register(api, huma.Operation{
		OperationID: "share-outfit",
		Method:      http.MethodPost,
		Path:        "/api/v1/outfits/{id}/share",
		Summary:     "Share an outfit by public link",
		Tags:        []string{"outfits"},
	}, controller.Share)

	huma.Register(api, huma.Operation{
		OperationID:   "unshare-outfit",
		Method:        http.MethodDelete,
		Path:          "/api/v1/outfits/{id}/share",
		DefaultStatus: http.StatusNoContent,
		Summary:       "Make a shared outfit private again",
		Description:   "Also returns 204 if the outfit is already private.",
		Tags:          []string{"outfits"},
	}, controller.Unshare)

	// Outside /api/v1, so the auth middleware does not run.
	huma.Register(api, huma.Operation{
		OperationID: "get-shared-outfit",
		Method:      http.MethodGet,
		Path:        "/api/public/outfits/{id}",
		Summary:     "Get a shared outfit without signing in",
		Description: "A private outfit and a missing one both return 404.",
		Tags:        []string{"outfits"},
	}, controller.GetShared)
}
