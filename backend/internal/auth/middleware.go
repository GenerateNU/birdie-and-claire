package auth

import (
	"strings"

	"github.com/danielgtaylor/huma/v2"
	"github.com/gofiber/fiber/v3"
)

const bearerPrefix = "Bearer "

// Middleware returns Fiber middleware that rejects requests without a valid
// bearer token and stores the verified user ID on the request context for
// UserID to read.
func Middleware(v *Verifier) fiber.Handler {
	return func(c fiber.Ctx) error {
		header := c.Get(fiber.HeaderAuthorization)
		if !strings.HasPrefix(header, bearerPrefix) {
			return unauthorized(c, "missing bearer token")
		}

		userID, err := v.Verify(strings.TrimPrefix(header, bearerPrefix))
		if err != nil {
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
	return c.Status(fiber.StatusUnauthorized).JSON(huma.Error401Unauthorized(detail))
}
