// Package types holds the wiring structs passed from the server down into the
// router files, so adding a dependency does not change every router signature.
package types

import (
	"example_project/internal/config"
	"example_project/internal/repository"
	"example_project/internal/storage"
)

type ServiceParams struct {
	Repository *repository.Repository
	Config     *config.Configuration
	Storage    storage.ObjectStore
}

type RouteParams struct {
	ServiceParams *ServiceParams
}
