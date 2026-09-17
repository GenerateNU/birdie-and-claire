// Package log is the logging entry point for application code. Every function
// takes a context so the request ID travels with the record; Go has no ambient
// per-request state, so the context is the only way for it to get there.
package log

import (
	"context"
	"log/slog"
)

type requestIDKey struct{}

// WithRequestID is called by the request-logging middleware.
func WithRequestID(ctx context.Context, id string) context.Context {
	return context.WithValue(ctx, requestIDKey{}, id)
}

// RequestID returns the ID assigned to this request, or "" outside a request.
func RequestID(ctx context.Context) string {
	id, _ := ctx.Value(requestIDKey{}).(string)
	return id
}

func Debug(ctx context.Context, msg string, args ...any) {
	slog.Default().DebugContext(ctx, msg, args...)
}

func Info(ctx context.Context, msg string, args ...any) {
	slog.Default().InfoContext(ctx, msg, args...)
}

func Warn(ctx context.Context, msg string, args ...any) {
	slog.Default().WarnContext(ctx, msg, args...)
}

func Error(ctx context.Context, msg string, args ...any) {
	slog.Default().ErrorContext(ctx, msg, args...)
}
