package routers

import (
	"net/http"

	"birdie-and-claire/internal/controllers"
	"birdie-and-claire/internal/services"
	"birdie-and-claire/internal/types"

	"github.com/danielgtaylor/huma/v2"
)

func CollectionRoutes(api huma.API, params types.RouteParams) {
	service := services.NewCollectionService(params.ServiceParams.Repository)
	controller := controllers.NewCollectionController(service)

	huma.Register(api, huma.Operation{
		OperationID:   "create-collection",
		Method:        http.MethodPost,
		Path:          "/api/v1/collections",
		DefaultStatus: http.StatusCreated,
		Summary:       "Create a collection",
		Tags:          []string{"collections"},
	}, controller.Create)

	huma.Register(api, huma.Operation{
		OperationID: "list-collections",
		Method:      http.MethodGet,
		Path:        "/api/v1/collections",
		Summary:     "List the authenticated user's collections",
		Description: "Newest first, each with its outfit count and up to 4 thumbnails. The list is not paginated.",
		Tags:        []string{"collections"},
	}, controller.List)

	huma.Register(api, huma.Operation{
		OperationID: "get-collection",
		Method:      http.MethodGet,
		Path:        "/api/v1/collections/{id}",
		Summary:     "Get one of the authenticated user's collections with its outfits",
		Description: "Someone else's collection and a missing one both return 404.",
		Tags:        []string{"collections"},
	}, controller.Get)

	huma.Register(api, huma.Operation{
		OperationID: "update-collection",
		Method:      http.MethodPatch,
		Path:        "/api/v1/collections/{id}",
		Summary:     "Update a collection's name or description",
		Tags:        []string{"collections"},
	}, controller.Update)

	huma.Register(api, huma.Operation{
		OperationID:   "delete-collection",
		Method:        http.MethodDelete,
		Path:          "/api/v1/collections/{id}",
		DefaultStatus: http.StatusNoContent,
		Summary:       "Delete a collection",
		Description:   "The collection's outfits stay saved. Someone else's collection and a missing one both return 404, so a repeated call returns 404.",
		Tags:          []string{"collections"},
	}, controller.Delete)
}
