// Package errs defines the error vocabulary shared by the repository, service,
// and controller layers, and maps it onto HTTP responses.
package errs

import (
	"errors"

	"github.com/danielgtaylor/huma/v2"
)

// Sentinel errors returned by repositories and services. Layers below the
// controller use these instead of HTTP errors so that non-HTTP callers, such as
// background workers, can consume the same services.
var (
	ErrNotFound  = errors.New("not found")
	ErrDuplicate = errors.New("already exists")
	ErrConflict  = errors.New("conflicting state")
	ErrBadCursor = errors.New("invalid cursor")
)

// ToHuma converts an error from the service layer into the HTTP error Huma
// writes to the client. Unrecognised errors become a 500 so that internal
// detail never reaches the response body.
func ToHuma(err error) error {
	switch {
	case err == nil:
		return nil
	case errors.Is(err, ErrNotFound):
		return huma.Error404NotFound(ErrNotFound.Error())
	case errors.Is(err, ErrDuplicate):
		return huma.Error409Conflict(ErrDuplicate.Error())
	case errors.Is(err, ErrConflict):
		return huma.Error409Conflict(ErrConflict.Error())
	case errors.Is(err, ErrBadCursor):
		return huma.Error400BadRequest(ErrBadCursor.Error())
	default:
		return huma.Error500InternalServerError("internal server error")
	}
}
