// Package middlewares registers the Fiber middleware chain that runs before
// every route, including routes Huma does not own.
package middlewares

import (
	"example_project/internal/auth"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/recover"
)

// Setup installs the middleware chain on the app, outermost first.
func Setup(app *fiber.App, verifier *auth.Verifier) {
	app.Use(recover.New())
	app.Use(requestLogger())
	// Runs after the request logger so rejected requests still get a request ID.
	app.Use("/api/v1", auth.Middleware(verifier))
}
