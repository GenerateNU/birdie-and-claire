// Package middlewares registers the Fiber middleware chain that runs before
// every route, including routes Huma does not own.
package middlewares

import (
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/recover"
)

// Setup installs the middleware chain on the app, outermost first.
func Setup(app *fiber.App) {
	app.Use(recover.New())
	app.Use(requestLogger())
}
