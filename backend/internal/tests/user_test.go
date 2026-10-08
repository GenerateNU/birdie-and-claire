package tests

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"testing"

	"birdie-and-claire/internal/controllers"

	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/humatest"
)

type userProbeInput struct {
	controllers.CreateUserInput
}

type userProbeOutput struct {
	Body struct {
		Name string `json:"name"`
	}
}

func userProbe(t *testing.T) humatest.TestAPI {
	t.Helper()

	_, api := humatest.New(t)
	huma.Register(api, huma.Operation{
		OperationID: "user-probe",
		Method:      http.MethodPost,
		Path:        "/probe",
	}, func(_ context.Context, input *userProbeInput) (*userProbeOutput, error) {
		output := &userProbeOutput{}
		output.Body.Name = input.Body.Name
		return output, nil
	})

	return api
}

func TestCreateUserName(t *testing.T) {
	tests := []struct {
		name       string
		body       map[string]any
		wantStatus int
		wantName   string
	}{
		{name: "empty", body: map[string]any{"name": ""}, wantStatus: http.StatusUnprocessableEntity},
		{name: "whitespace only", body: map[string]any{"name": "   "}, wantStatus: http.StatusUnprocessableEntity},
		{name: "plain", body: map[string]any{"name": "Claire"}, wantStatus: http.StatusOK, wantName: "Claire"},
		{name: "surrounding whitespace is trimmed", body: map[string]any{"name": "  Julie  "}, wantStatus: http.StatusOK, wantName: "Julie"},
		{name: "maximum 100 characters", body: map[string]any{"name": strings.Repeat("n", 100)}, wantStatus: http.StatusOK, wantName: strings.Repeat("n", 100)},
		{name: "above maximum 101 characters", body: map[string]any{"name": strings.Repeat("n", 101)}, wantStatus: http.StatusUnprocessableEntity},
		{name: "missing", body: map[string]any{}, wantStatus: http.StatusUnprocessableEntity},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			response := userProbe(t).Post("/probe", test.body)
			if response.Code != test.wantStatus {
				t.Fatalf("status = %d, want %d: %s", response.Code, test.wantStatus, response.Body)
			}
			if test.wantStatus != http.StatusOK {
				return
			}

			var echoed struct {
				Name string `json:"name"`
			}
			if err := json.Unmarshal(response.Body.Bytes(), &echoed); err != nil {
				t.Fatalf("decode body %s: %v", response.Body, err)
			}
			if echoed.Name != test.wantName {
				t.Fatalf("name = %q, want %q", echoed.Name, test.wantName)
			}
		})
	}
}
