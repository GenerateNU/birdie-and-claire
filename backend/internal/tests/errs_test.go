package tests

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"testing"

	"birdie-and-claire/internal/errs"

	"github.com/danielgtaylor/huma/v2"
)

// captureLogs routes slog.Default, which internal/log writes through, into a buffer for one test.
func captureLogs(t *testing.T) *bytes.Buffer {
	t.Helper()

	previous := slog.Default()
	t.Cleanup(func() { slog.SetDefault(previous) })

	var buffer bytes.Buffer
	slog.SetDefault(slog.New(slog.NewJSONHandler(&buffer, nil)))
	return &buffer
}

func statusOf(t *testing.T, err error) int {
	t.Helper()

	var statusErr huma.StatusError
	if !errors.As(err, &statusErr) {
		t.Fatalf("ToHuma() = %v, want a huma.StatusError", err)
	}
	return statusErr.GetStatus()
}

// The 500 body stays generic, so the cause has to reach the logs or it is lost.
func TestToHumaLogsUnrecognisedCause(t *testing.T) {
	logs := captureLogs(t)
	cause := fmt.Errorf("list outfits for user %s: %w", "u-123", errors.New("boom"))

	err := errs.ToHuma(context.Background(), cause)

	if status := statusOf(t, err); status != http.StatusInternalServerError {
		t.Fatalf("status = %d, want %d", status, http.StatusInternalServerError)
	}
	var model *huma.ErrorModel
	if !errors.As(err, &model) || model.Detail != "internal server error" {
		t.Fatalf("ToHuma() = %v, want detail %q", err, "internal server error")
	}

	logged := logs.String()
	for _, want := range []string{`"level":"ERROR"`, "list outfits for user u-123", "boom"} {
		if !strings.Contains(logged, want) {
			t.Fatalf("logs = %s, want them to contain %s", logged, want)
		}
	}
}

func TestToHumaDoesNotLogSentinels(t *testing.T) {
	tests := []struct {
		name string
		err  error
		want int
	}{
		{name: "not found", err: errs.ErrNotFound, want: http.StatusNotFound},
		{name: "wrapped bad cursor", err: fmt.Errorf("list outfits for user u-123: after cursor id: %w", errs.ErrBadCursor), want: http.StatusBadRequest},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			logs := captureLogs(t)

			if status := statusOf(t, errs.ToHuma(context.Background(), test.err)); status != test.want {
				t.Fatalf("status = %d, want %d", status, test.want)
			}
			if logs.Len() != 0 {
				t.Fatalf("logs = %s, want nothing logged", logs)
			}
		})
	}
}

func TestToHumaNilIsNil(t *testing.T) {
	logs := captureLogs(t)

	if err := errs.ToHuma(context.Background(), nil); err != nil {
		t.Fatalf("ToHuma(nil) = %v, want nil", err)
	}
	if logs.Len() != 0 {
		t.Fatalf("logs = %s, want nothing logged", logs)
	}
}
