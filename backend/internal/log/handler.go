package log

import (
	"context"
	"log/slog"
	"os"

	"example_project/internal/config"

	"github.com/lmittmann/tint"
)

// requestIDHandler stamps the request ID onto every record logged with a
// context that carries one, so application logs can be grouped with the
// request line that produced them.
type requestIDHandler struct {
	slog.Handler
	short bool
}

func (h requestIDHandler) Handle(ctx context.Context, record slog.Record) error {
	if id := RequestID(ctx); id != "" {
		if h.short && len(id) > shortIDLength {
			id = id[:shortIDLength]
		}
		record.AddAttrs(slog.String("id", id))
	}
	return h.Handler.Handle(ctx, record)
}

func (h requestIDHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	return requestIDHandler{Handler: h.Handler.WithAttrs(attrs), short: h.short}
}

func (h requestIDHandler) WithGroup(name string) slog.Handler {
	return requestIDHandler{Handler: h.Handler.WithGroup(name), short: h.short}
}

// Install builds the process logger and makes it the slog default, which is
// what the package-level Info, Warn, and Error call through.
func Install(format config.LogFormat) *slog.Logger {
	var (
		handler slog.Handler
		short   bool
	)

	if format == config.LogFormatJSON {
		handler = slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo})
	} else {
		handler = tint.NewHandler(os.Stdout, &tint.Options{
			Level:       slog.LevelInfo,
			TimeFormat:  "15:04:05",
			ReplaceAttr: dropRequestLineAttrs,
		})
		short = true
	}

	logger := slog.New(requestIDHandler{Handler: handler, short: short})
	slog.SetDefault(logger)
	return logger
}

// dropRequestLineAttrs removes the fields the request logger already spells out
// in its message. They stay in JSON output, where they are what you filter on.
func dropRequestLineAttrs(groups []string, attr slog.Attr) slog.Attr {
	if len(groups) > 0 {
		return attr
	}
	switch attr.Key {
	case "status", "method", "path":
		return slog.Attr{}
	default:
		return attr
	}
}
