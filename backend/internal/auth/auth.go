package auth

import (
	"context"

	"github.com/google/uuid"
)

type userIDKey struct{}

// UserID returns the authenticated user's ID, or uuid.Nil outside a request
// that passed Middleware.
func UserID(ctx context.Context) uuid.UUID {
	id, _ := ctx.Value(userIDKey{}).(uuid.UUID)
	return id
}

// Can write userId to context
func withUserID(ctx context.Context, id uuid.UUID) context.Context {
	return context.WithValue(ctx, userIDKey{}, id)
}
