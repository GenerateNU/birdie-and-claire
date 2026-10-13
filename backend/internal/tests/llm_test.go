package tests

import (
	"net/http"
	"strings"
	"testing"

	"birdie-and-claire/internal/auth"
	"birdie-and-claire/internal/config"
	"birdie-and-claire/internal/llm/llmtest"
	"birdie-and-claire/internal/server/routers"
	"birdie-and-claire/internal/types"

	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/humatest"
	"github.com/google/uuid"
)

var (
	llmTester = uuid.MustParse("3f0c9a1e-5b7d-4e2a-9c61-8d2b7f4a1c05")
	llmOther  = uuid.MustParse("7b2e4d10-1c3a-4f5e-8a9b-0c1d2e3f4a5b")
)

// llmProbe serves the LLM routes as caller, standing in for the auth middleware.
func llmProbe(t *testing.T, testers []uuid.UUID, caller uuid.UUID) (humatest.TestAPI, *llmtest.Fake) {
	t.Helper()

	_, api := humatest.New(t)
	api.UseMiddleware(func(ctx huma.Context, next func(huma.Context)) {
		next(huma.WithContext(ctx, auth.WithUserID(ctx.Context(), caller)))
	})

	fake := &llmtest.Fake{
		Text:   `{"occasion":"brunch","pieces":["linen dress"],"why":"relaxed"}`,
		Chunks: []string{"Linen ", "and flats."},
	}
	routers.LLMRoutes(api, types.RouteParams{ServiceParams: &types.ServiceParams{
		Config: &config.Configuration{LLM: config.LLMConfig{DevUserIDs: testers}},
		LLM:    fake,
	}})
	return api, fake
}

func TestLLMRoutesAllowOnlyTesters(t *testing.T) {
	routes := []string{"/api/v1/llm/generate", "/api/v1/llm/generate/structured", "/api/v1/llm/stream"}
	callers := []struct {
		name       string
		testers    []uuid.UUID
		caller     uuid.UUID
		wantStatus int
	}{
		{name: "allowed user", testers: []uuid.UUID{llmTester}, caller: llmTester, wantStatus: http.StatusOK},
		{name: "user not on the list", testers: []uuid.UUID{llmTester}, caller: llmOther, wantStatus: http.StatusForbidden},
		{name: "empty list", testers: nil, caller: llmTester, wantStatus: http.StatusForbidden},
	}

	for _, route := range routes {
		for _, tt := range callers {
			t.Run(route+" "+tt.name, func(t *testing.T) {
				api, fake := llmProbe(t, tt.testers, tt.caller)

				response := api.Post(route, map[string]any{"prompt": "brunch"})
				if response.Code != tt.wantStatus {
					t.Fatalf("status = %d, want %d: %s", response.Code, tt.wantStatus, response.Body)
				}
				checkLLMResponse(t, route, response.Header().Get("Content-Type"), response.Body.String(), tt.wantStatus, tt.caller)

				wantRequests := 0
				if tt.wantStatus == http.StatusOK {
					wantRequests = 1
				}
				if got := len(fake.Requests()); got != wantRequests {
					t.Errorf("fake received %d requests, want %d", got, wantRequests)
				}
			})
		}
	}
}

func checkLLMResponse(t *testing.T, route, contentType, body string, status int, caller uuid.UUID) {
	t.Helper()
	if status == http.StatusForbidden {
		// the stream must refuse before its SSE headers, as an ordinary problem response
		if !strings.Contains(contentType, "application/problem+json") || !strings.Contains(body, "not on the LLM test list; your user id is "+caller.String()) {
			t.Errorf("403 = %s %s, want a problem+json naming the LLM test list and the caller's id", contentType, body)
		}
		return
	}
	if strings.HasSuffix(route, "/stream") && (!strings.Contains(contentType, "text/event-stream") || !strings.Contains(body, "event: done")) {
		t.Errorf("stream = %s %s, want a finished event stream", contentType, body)
	}
}
