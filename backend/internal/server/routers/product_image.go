package routers

import (
	"net/http"

	"example_project/internal/controllers"
	"example_project/internal/services"
	"example_project/internal/types"

	"github.com/danielgtaylor/huma/v2"
)

func ProductImageRoutes(api huma.API, params types.RouteParams) {
	service := services.NewProductImageService(params.ServiceParams.Repository)
	controller := controllers.NewProductImageController(service)

	huma.Register(api, huma.Operation{
		OperationID: "list-product-images",
		Method:      http.MethodGet,
		Path:        "/api/v1/products/{product_id}/images",
		Summary:     "List a product's images",
		Tags:        []string{"products"},
	}, controller.List)
}
