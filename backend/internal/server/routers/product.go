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
	}, controller.List)
}
