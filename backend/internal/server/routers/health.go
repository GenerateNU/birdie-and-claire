package routers

import (
	"net/http"

	"example_project/internal/controllers"
	"example_project/internal/types"

	"github.com/danielgtaylor/huma/v2"
)

func HealthRoutes(api huma.API, _ types.RouteParams) {
	controller := controllers.NewHealthController()

	huma.Register(api, huma.Operation{
		OperationID: "health",
		Method:      http.MethodGet,
		Path:        "/health",
		Summary:     "Liveness probe",
		Description: "Reports only that the process is running. Never checks dependencies, because a failing liveness probe gets the process killed.",
		Tags:        []string{"meta"},
	}, controller.Liveness)
}
