// Package types holds the wiring structs passed from the server down into the
// router files, so adding a dependency does not change every router signature.
package types

import (
	"birdie-and-claire/internal/auth"
	"birdie-and-claire/internal/config"
	"birdie-and-claire/internal/embedder"
	"birdie-and-claire/internal/repository"
	"birdie-and-claire/internal/storage"
)

type ServiceParams struct {
	Repository *repository.Repository
	Config     *config.Configuration
	Storage    storage.ObjectStore
	Embedder   embedder.Embedder
}

type RouteParams struct {
	ServiceParams *ServiceParams
	// Verifier is nil when building the spec, where no handler runs.
	Verifier *auth.Verifier
}
