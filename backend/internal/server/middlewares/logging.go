package middlewares

import (
	"errors"
	"fmt"
	"log/slog"

	"example_project/internal/log"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

const requestIDHeader = "X-Request-Id"

// requestLogger gives every request an ID, puts it on the context so
// application logs inherit it, and emits one record when the request finishes.
// The client's X-Request-Id is reused when present so a trace survives across
// services.
func requestLogger() fiber.Handler {
	return func(c fiber.Ctx) error {
		requestID := c.Get(requestIDHeader)
		if requestID == "" {
			requestID = uuid.NewString()
		}
		c.Set(requestIDHeader, requestID)
		c.SetContext(log.WithRequestID(c.Context(), requestID))

		err := c.Next()
		status := responseStatus(c, err)

		attrs := []any{
			slog.Int("status", status),
			slog.String("method", c.Method()),
			slog.String("path", c.Path()),
		}
		if err != nil {
			attrs = append(attrs, slog.Any("error", err))
		}

		logForStatus(c, status, fmt.Sprintf("%d %s %s", status, c.Method(), c.Path()), attrs)
		return err
	}
}

// logForStatus keeps client mistakes out of the error stream.
func logForStatus(c fiber.Ctx, status int, message string, attrs []any) {
	switch {
	case status >= 500:
		log.Error(c.Context(), message, attrs...)
	case status >= 400:
		log.Warn(c.Context(), message, attrs...)
	default:
		log.Info(c.Context(), message, attrs...)
	}
}

// responseStatus reports the status the client will actually see. When a
// handler returns an error, Fiber's error handler runs after this middleware
// unwinds, so the recorded response still says 200 and the status has to come
// from the error instead.
func responseStatus(c fiber.Ctx, err error) int {
	if err == nil {
		return c.Response().StatusCode()
	}

	var fiberErr *fiber.Error
	if errors.As(err, &fiberErr) {
		return fiberErr.Code
	}
	return fiber.StatusInternalServerError
}
