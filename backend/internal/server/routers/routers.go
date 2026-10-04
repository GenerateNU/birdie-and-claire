// Package routers maps paths to controller methods, one file per resource.
package routers

import (
	"birdie-and-claire/internal/types"

	"github.com/danielgtaylor/huma/v2"
)

func Setup(api huma.API, params types.RouteParams) {
	HealthRoutes(api, params)
	UserRoutes(api, params)
	OutfitRoutes(api, params)
	OutfitReactionRoutes(api, params)
	EmbedderRoutes(api, params)
}