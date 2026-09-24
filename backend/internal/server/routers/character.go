package routers

import (
	"net/http"

	"example_project/internal/controllers"
	"example_project/internal/services"
	"example_project/internal/types"

	"github.com/danielgtaylor/huma/v2"
)

func CharacterRoutes(api huma.API, params types.RouteParams) {
	service := services.NewCharacterService(params.ServiceParams.Repository)
	controller := controllers.NewCharacterController(service)

	huma.Register(api, huma.Operation{
		OperationID: "list-characters",
		Method:      http.MethodGet,
		Path:        "/api/v1/characters",
		Summary:     "List characters by faction",
		Tags:        []string{"characters"},
	}, controller.List)
}
