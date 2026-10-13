package llm

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"runtime"
	"strings"
	"sync"
	"testing"
	"time"

	"birdie-and-claire/internal/config"

	"github.com/firebase/genkit/go/plugins/middleware"
)

const stubModel = "vendor/test-model"

// stubGateway drives the real adapter and plugin, so nothing reaches the network.
type stubGateway struct {
	srv *httptest.Server

	mu     sync.Mutex
	bodies []chatRequest
}

type chatRequest struct {
	Model    string `json:"model"`
	Stream   bool   `json:"stream"`
	Messages []struct {
		Role       string `json:"role"`
		Content    any    `json:"content"`
		ToolCallID string `json:"tool_call_id"`
	} `json:"messages"`
	Tools []struct {
		Function struct {
			Name       string         `json:"name"`
			Parameters map[string]any `json:"parameters"`
		} `json:"function"`
	} `json:"tools"`
}

// call counts from 1 across the stub's life
type stubHandler func(w http.ResponseWriter, r *http.Request, call int, body chatRequest)

// fastRetry keeps the production retry count but drops the backoff.
var fastRetry = middleware.Retry{MaxRetries: maxRetries, InitialDelayMs: 1, MaxDelayMs: 1, NoJitter: true}

func newStubClient(t *testing.T, retry middleware.Retry, handler stubHandler) (*genkitClient, *stubGateway) {
	t.Helper()
	stub := &stubGateway{}
	stub.srv = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/chat/completions" || r.Header.Get("Authorization") != "Bearer test-key" {
			t.Errorf("got %s %s with auth %q", r.Method, r.URL.Path, r.Header.Get("Authorization"))
		}
		var body chatRequest
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Errorf("decode request: %v", err)
		}
		stub.mu.Lock()
		stub.bodies = append(stub.bodies, body)
		call := len(stub.bodies)
		stub.mu.Unlock()
		handler(w, r, call, body)
	}))
	t.Cleanup(stub.srv.Close)

	cfg := config.LLMConfig{APIKey: "test-key", BaseURL: stub.srv.URL, Model: stubModel}
	return newGenkitClient(context.Background(), cfg, retry), stub
}

func (s *stubGateway) requests() []chatRequest {
	s.mu.Lock()
	defer s.mu.Unlock()
	return append([]chatRequest(nil), s.bodies...)
}

func (s *stubGateway) calls() int {
	s.mu.Lock()
	defer s.mu.Unlock()
	return len(s.bodies)
}

const stubUsage = `{"prompt_tokens":10,"completion_tokens":5,"total_tokens":15,"cost":0.25}`

func respondText(text string) stubHandler {
	return func(w http.ResponseWriter, _ *http.Request, _ int, _ chatRequest) {
		writeCompletion(w, text, "stop")
	}
}

func writeCompletion(w http.ResponseWriter, text, finishReason string) {
	content, _ := json.Marshal(text)
	w.Header().Set("Content-Type", "application/json")
	_, _ = fmt.Fprintf(w, `{"id":"c1","object":"chat.completion","created":0,"model":%q,`+
		`"choices":[{"index":0,"message":{"role":"assistant","content":%s},"finish_reason":%q}],"usage":%s}`,
		stubModel, content, finishReason, stubUsage)
}

func writeToolCall(w http.ResponseWriter, name, arguments string) {
	args, _ := json.Marshal(arguments)
	w.Header().Set("Content-Type", "application/json")
	_, _ = fmt.Fprintf(w, `{"id":"c1","object":"chat.completion","created":0,"model":%q,`+
		`"choices":[{"index":0,"message":{"role":"assistant","content":null,"tool_calls":`+
		`[{"id":"call_1","type":"function","function":{"name":%q,"arguments":%s}}]},"finish_reason":"tool_calls"}],"usage":%s}`,
		stubModel, name, args, stubUsage)
}

func respondStatus(code int) stubHandler {
	return func(w http.ResponseWriter, _ *http.Request, _ int, _ chatRequest) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(code)
		_, _ = fmt.Fprintf(w, `{"error":{"message":"stub status %d","code":%d}}`, code, code)
	}
}

type sse struct {
	w http.ResponseWriter
}

func startSSE(w http.ResponseWriter) sse {
	w.Header().Set("Content-Type", "text/event-stream")
	w.WriteHeader(http.StatusOK)
	return sse{w: w}
}

func (s sse) chunk(text string) {
	content, _ := json.Marshal(text)
	s.send(fmt.Sprintf(`{"id":"c1","object":"chat.completion.chunk","created":0,"model":%q,`+
		`"choices":[{"index":0,"delta":{"role":"assistant","content":%s},"finish_reason":null}]}`, stubModel, content))
}

func (s sse) finish() {
	s.send(fmt.Sprintf(`{"id":"c1","object":"chat.completion.chunk","created":0,"model":%q,`+
		`"choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}`, stubModel))
	s.send(fmt.Sprintf(`{"id":"c1","object":"chat.completion.chunk","created":0,"model":%q,"choices":[],"usage":%s}`, stubModel, stubUsage))
	s.send("[DONE]")
}

func (s sse) send(data string) {
	_, _ = io.WriteString(s.w, "data: "+data+"\n\n")
	s.w.(http.Flusher).Flush()
}

func streamText(chunks ...string) stubHandler {
	return func(w http.ResponseWriter, _ *http.Request, _ int, _ chatRequest) {
		stream := startSSE(w)
		for _, chunk := range chunks {
			stream.chunk(chunk)
		}
		stream.finish()
	}
}

// dropConnection aborts mid-response, which the client sees as a transport error.
func dropConnection() {
	panic(http.ErrAbortHandler)
}

func readAll(t *testing.T, reader ChunkReader) []string {
	t.Helper()
	var chunks []string
	for {
		chunk, err := reader.Next()
		if errors.Is(err, io.EOF) {
			return chunks
		}
		if err != nil {
			t.Fatalf("Next after %q: %v", chunks, err)
		}
		chunks = append(chunks, chunk)
	}
}

// connection goroutines take a moment to unwind after a close, so this polls
func waitForGoroutines(t *testing.T, baseline int) {
	t.Helper()
	deadline := time.Now().Add(5 * time.Second)
	for runtime.NumGoroutine() > baseline {
		if time.Now().After(deadline) {
			buf := make([]byte, 1<<20)
			t.Fatalf("goroutines = %d, want <= %d\n%s", runtime.NumGoroutine(), baseline, buf[:runtime.Stack(buf, true)])
		}
		time.Sleep(10 * time.Millisecond)
	}
}

// the plugin sends system content as a string and user content as text parts
func messageText(content any) string {
	parts, ok := content.([]any)
	if !ok {
		return fmt.Sprint(content)
	}
	var text strings.Builder
	for _, part := range parts {
		if part, ok := part.(map[string]any); ok {
			_, _ = fmt.Fprint(&text, part["text"])
		}
	}
	return text.String()
}
