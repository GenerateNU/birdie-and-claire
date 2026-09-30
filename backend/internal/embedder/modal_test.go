package embedder

import (
	"context"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"example_project/internal/config"
	"example_project/internal/errs"
)

// vectorJSON builds a JSON array of n numbers, all 0.1.
func vectorJSON(n int) string {
	values := make([]string, n)
	for i := range values {
		values[i] = "0.1"
	}
	return "[" + strings.Join(values, ",") + "]"
}

func newTestClient(t *testing.T, handler http.HandlerFunc) Embedder {
	t.Helper()
	srv := httptest.NewServer(handler)
	t.Cleanup(srv.Close)
	return New(config.EmbedderConfig{URL: srv.URL, ProxyKey: "test-key", ProxySecret: "test-secret"})
}

func respondWith(status int, body string) http.HandlerFunc {
	return func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(status)
		_, _ = io.WriteString(w, body)
	}
}

func TestEmbedTextSendsRequestAndReturnsVector(t *testing.T) {
	client := newTestClient(t, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost || r.URL.Path != "/embed" {
			t.Errorf("got %s %s, want POST /embed", r.Method, r.URL.Path)
		}
		if got := r.Header.Get("Modal-Key"); got != "test-key" {
			t.Errorf("Modal-Key = %q, want test-key", got)
		}
		if got := r.Header.Get("Modal-Secret"); got != "test-secret" {
			t.Errorf("Modal-Secret = %q, want test-secret", got)
		}
		body, err := io.ReadAll(r.Body)
		if err != nil {
			t.Errorf("read request body: %v", err)
		}
		if want := `{"inputs":[{"kind":"text","value":"red dress"}]}`; string(body) != want {
			t.Errorf("body = %s, want %s", body, want)
		}
		_, _ = io.WriteString(w, `{"embeddings":[`+vectorJSON(embeddingSize)+`]}`)
	})

	vector, err := client.EmbedText(context.Background(), "red dress")
	if err != nil {
		t.Fatalf("EmbedText: %v", err)
	}
	if len(vector) != embeddingSize || vector[0] != 0.1 {
		t.Fatalf("got %d dims starting %v, want %d dims of 0.1", len(vector), vector[0], embeddingSize)
	}
}

func TestEmbedImageSendsImageURLKind(t *testing.T) {
	client := newTestClient(t, func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(r.Body)
		if err != nil {
			t.Errorf("read request body: %v", err)
		}
		if want := `{"inputs":[{"kind":"image_url","value":"https://example.com/shirt.jpg"}]}`; string(body) != want {
			t.Errorf("body = %s, want %s", body, want)
		}
		_, _ = io.WriteString(w, `{"embeddings":[`+vectorJSON(embeddingSize)+`]}`)
	})

	if _, err := client.EmbedImage(context.Background(), "https://example.com/shirt.jpg"); err != nil {
		t.Fatalf("EmbedImage: %v", err)
	}
}

func TestEmbedErrorStatus(t *testing.T) {
	tests := []struct {
		name             string
		status           int
		body             string
		wantInvalidInput bool
	}{
		{
			name:             "422 is invalid input",
			status:           http.StatusUnprocessableEntity,
			body:             `{"detail":"inputs[0]: image must be https"}`,
			wantInvalidInput: true,
		},
		{
			name:   "500 is not invalid input",
			status: http.StatusInternalServerError,
			body:   `internal error`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			client := newTestClient(t, respondWith(tt.status, tt.body))

			_, err := client.EmbedText(context.Background(), "red dress")
			if err == nil {
				t.Fatal("expected an error")
			}
			if got := errors.Is(err, errs.ErrInvalidInput); got != tt.wantInvalidInput {
				t.Errorf("errors.Is(err, ErrInvalidInput) = %v, want %v (err: %v)", got, tt.wantInvalidInput, err)
			}
			if !strings.Contains(err.Error(), tt.body) {
				t.Errorf("error %q does not contain body %q", err, tt.body)
			}
		})
	}
}

func TestEmbedRejectsEmptyInputWithoutRequest(t *testing.T) {
	client := newTestClient(t, func(http.ResponseWriter, *http.Request) {
		t.Error("server should not be called for empty input")
	})

	calls := []struct {
		name  string
		embed func() ([]float32, error)
	}{
		{"empty text", func() ([]float32, error) { return client.EmbedText(context.Background(), "") }},
		{"whitespace text", func() ([]float32, error) { return client.EmbedText(context.Background(), "   ") }},
		{"empty image url", func() ([]float32, error) { return client.EmbedImage(context.Background(), "") }},
		{"whitespace image url", func() ([]float32, error) { return client.EmbedImage(context.Background(), " \t ") }},
	}

	for _, call := range calls {
		t.Run(call.name, func(t *testing.T) {
			if _, err := call.embed(); !errors.Is(err, errs.ErrInvalidInput) {
				t.Errorf("got %v, want ErrInvalidInput", err)
			}
		})
	}
}

func TestEmbedRejectsBadResponseShape(t *testing.T) {
	tests := []struct {
		name string
		body string
	}{
		{"no vectors", `{"embeddings":[]}`},
		{"two vectors", `{"embeddings":[` + vectorJSON(embeddingSize) + `,` + vectorJSON(embeddingSize) + `]}`},
		{"empty vector", `{"embeddings":[[]]}`},
		{"three dimensions", `{"embeddings":[` + vectorJSON(3) + `]}`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			client := newTestClient(t, respondWith(http.StatusOK, tt.body))

			if _, err := client.EmbedText(context.Background(), "red dress"); err == nil {
				t.Fatal("expected an error")
			}
		})
	}
}

func TestEmbedStopsWhenContextExpires(t *testing.T) {
	// The server may not notice the client hanging up, so the handler also
	// waits on release. Cleanups run last-in first-out, so release closes
	// before srv.Close waits on this handler.
	release := make(chan struct{})
	client := newTestClient(t, func(_ http.ResponseWriter, r *http.Request) {
		select {
		case <-r.Context().Done():
		case <-release:
		}
	})
	t.Cleanup(func() { close(release) })

	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()

	start := time.Now()
	_, err := client.EmbedText(ctx, "red dress")
	if !errors.Is(err, context.DeadlineExceeded) {
		t.Fatalf("got %v, want context.DeadlineExceeded", err)
	}
	if elapsed := time.Since(start); elapsed > 2*time.Second {
		t.Errorf("took %v to return after the deadline", elapsed)
	}
}
