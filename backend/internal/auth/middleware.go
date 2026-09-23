package auth

import (
	"strings"

	"example_project/internal/log"

	"github.com/danielgtaylor/huma/v2"
	"github.com/gofiber/fiber/v3"
)

const problemJSON = "application/problem+json"

// Middleware returns Fiber middleware that rejects requests without a valid
// bearer token and stores the verified user ID on the request context for
// UserID to read.
func Middleware(v *Verifier) fiber.Handler {
	return func(c fiber.Ctx) error {
		// The auth scheme is case-insensitive, so "bearer" and "BEARER" count too.
		scheme, token, ok := strings.Cut(c.Get(fiber.HeaderAuthorization), " ")
		if !ok || !strings.EqualFold(scheme, "Bearer") || token == "" {
			return unauthorized(c, "missing bearer token")
		}

		userID, err := v.Verify(token)
		if err != nil {
			log.Info(c.Context(), "auth: token rejected", "error", err)
			return unauthorized(c, "invalid token")
		}

		c.SetContext(withUserID(c.Context(), userID))
		return c.Next()
	}
}

// unauthorized writes the 401 body directly instead of returning the error to
// Fiber's error handler: this middleware runs outside any route Huma has
// registered, so nothing downstream would lead to a huma.StatusError for us.
func unauthorized(c fiber.Ctx, detail string) error {
	return c.Status(fiber.StatusUnauthorized).JSON(huma.Error401Unauthorized(detail), problemJSON)
}
