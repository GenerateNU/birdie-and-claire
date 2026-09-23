package auth

import "context"

type userIDKey struct{}

// UserID returns the authenticated user's ID, or "" outside a request.
func UserID(ctx context.Context) string {
	id, _ := ctx.Value(userIDKey{}).(string)
	return id
}

// Can write userId to context
func withUserID(ctx context.Context, id string) context.Context {
	return context.WithValue(ctx, userIDKey{}, id)
}
