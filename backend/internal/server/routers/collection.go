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
		Description: "Newest first, each with its outfit count and up to 4 thumbnails. With outfit_id, each also says whether it holds that outfit.",
		Tags:        []string{"collections"},
	}, controller.ListUserCollections)

	huma.Register(api, huma.Operation{
		OperationID: "get-collection",
		Method:      http.MethodGet,
		Path:        "/api/v1/collections/{id}",
		Summary:     "Get one of the authenticated user's collections",
		Description: "Someone else's collection and a missing one both return 404.",
		Tags:        []string{"collections"},
	}, controller.Get)

	huma.Register(api, huma.Operation{
		OperationID: "list-collection-outfits",
		Method:      http.MethodGet,
		Path:        "/api/v1/collections/{id}/outfits",
		Summary:     "List the outfits in one of the authenticated user's collections",
		Description: "Newest added first. Someone else's collection and a missing one both return 404.",
		Tags:        []string{"collections"},
	}, controller.ListCollectionOutfits)

	huma.Register(api, huma.Operation{
		OperationID:   "add-collection-outfit",
		Method:        http.MethodPut,
		Path:          "/api/v1/collections/{id}/outfits/{outfit_id}",
		DefaultStatus: http.StatusNoContent,
		Summary:       "Add an outfit to one of the authenticated user's collections",
		Description:   "Adding an outfit the collection already holds changes nothing. A collection or outfit that is missing or someone else's returns 404.",
		Tags:          []string{"collections"},
	}, controller.AddOutfit)

	huma.Register(api, huma.Operation{
		OperationID:   "remove-collection-outfit",
		Method:        http.MethodDelete,
		Path:          "/api/v1/collections/{id}/outfits/{outfit_id}",
		DefaultStatus: http.StatusNoContent,
		Summary:       "Remove an outfit from one of the authenticated user's collections",
		Description:   "The outfit stays saved. Removing an outfit the collection does not hold changes nothing. Someone else's collection and a missing one both return 404.",
		Tags:          []string{"collections"},
	}, controller.RemoveOutfit)

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
