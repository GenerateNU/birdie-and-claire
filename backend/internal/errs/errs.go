// Package errs defines the error vocabulary shared by the repository, service,
// and controller layers, and maps it onto HTTP responses.
package errs

import (
	"context"
	"errors"

	"birdie-and-claire/internal/log"

	"github.com/danielgtaylor/huma/v2"
)

// Sentinel errors returned by repositories and services. Layers below the
// controller use these instead of HTTP errors so that non-HTTP callers, such as
// background workers, can consume the same services.
var (
	ErrNotFound     = errors.New("not found")
	ErrDuplicate    = errors.New("already exists")
	ErrConflict     = errors.New("conflicting state")
	ErrInvalidInput = errors.New("invalid input")
	ErrBadCursor    = errors.New("invalid cursor")
)

// ToHuma maps a service error to an HTTP error. An unrecognised error becomes a
// generic 500 so its detail never reaches the client; the cause is logged.
func ToHuma(ctx context.Context, err error) error {
	switch {
	case err == nil:
		return nil
	case errors.Is(err, ErrNotFound):
		return huma.Error404NotFound(ErrNotFound.Error())
	case errors.Is(err, ErrInvalidInput):
		return huma.Error400BadRequest(ErrInvalidInput.Error())
	case errors.Is(err, ErrDuplicate):
		return huma.Error409Conflict(ErrDuplicate.Error())
	case errors.Is(err, ErrConflict):
		return huma.Error409Conflict(ErrConflict.Error())
	case errors.Is(err, ErrBadCursor):
		return huma.Error400BadRequest(ErrBadCursor.Error())
	default:
		log.Error(ctx, "request failed", "error", err)
		return huma.Error500InternalServerError("internal server error")
	}
}
