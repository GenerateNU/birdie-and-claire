// Package routers maps paths to controller methods, one file per resource.
package routers

import (
	"example_project/internal/types"

	"github.com/danielgtaylor/huma/v2"
)

func Setup(api huma.API, params types.RouteParams) {
	HealthRoutes(api, params)
	CharacterRoutes(api, params)
}
