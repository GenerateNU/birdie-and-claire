package routers

import (
	"net/http"

	"birdie-and-claire/internal/controllers"
	"birdie-and-claire/internal/services"
	"birdie-and-claire/internal/types"

	"github.com/danielgtaylor/huma/v2"
)

func ProductRoutes(api huma.API, params types.RouteParams) {
	service := services.NewProductService(params.ServiceParams.Repository)
	controller := controllers.NewProductController(service)

	huma.Register(api, huma.Operation{
		OperationID: "list-products",
		Method:      http.MethodGet,
		Path:        "/api/v1/products",
		Summary:     "List catalog products the authenticated user can add to the pieces they own",
		Description: "Newest first. Products the user already owns are left out.",
		Tags:        []string{"products"},
	}, controller.ListUnownedProducts)

	huma.Register(api, huma.Operation{
		OperationID: "list-birdie-and-claire-products",
		Method:      http.MethodGet,
		Path:        "/api/v1/products/birdie-and-claire",
		Summary:     "List the Birdie & Claire products in one category that the authenticated user doesn't own",
		Description: "Active store products only, newest first. Demo filler and owned products are left out.",
		Tags:        []string{"products"},
	}, controller.ListUnownedBirdieAndClaireProducts)
}
