package routers

import (
	"net/http"

	"birdie-and-claire/internal/controllers"
	"birdie-and-claire/internal/services"
	"birdie-and-claire/internal/types"

	"github.com/danielgtaylor/huma/v2"
)

func OwnedProductRoutes(api huma.API, params types.RouteParams) {
	service := services.NewOwnedProductService(params.ServiceParams.Repository)
	controller := controllers.NewOwnedProductController(service)

	huma.Register(api, huma.Operation{
		OperationID: "list-current-user-pieces",
		Method:      http.MethodGet,
		Path:        "/api/v1/users/me/pieces",
		Summary:     "List the catalog products the authenticated user owns",
		Description: "Most recently added first.",
		Tags:        []string{"pieces"},
	}, controller.ListOwnedProducts)

	huma.Register(api, huma.Operation{
		OperationID:   "add-current-user-pieces",
		Method:        http.MethodPost,
		Path:          "/api/v1/users/me/pieces",
		DefaultStatus: http.StatusNoContent,
		Summary:       "Add catalog products to the ones the authenticated user owns",
		Description:   "Products already owned are skipped. A product not in the catalog fails the whole request with 409.",
		Tags:          []string{"pieces"},
	}, controller.AddOwnedProducts)

	huma.Register(api, huma.Operation{
		OperationID:   "remove-current-user-piece",
		Method:        http.MethodDelete,
		Path:          "/api/v1/users/me/pieces/{product_id}",
		DefaultStatus: http.StatusNoContent,
		Summary:       "Remove a product from the ones the authenticated user owns",
		Description:   "Returns 404 if the user doesn't own the product.",
		Tags:          []string{"pieces"},
	}, controller.RemoveOwnedProduct)
}
