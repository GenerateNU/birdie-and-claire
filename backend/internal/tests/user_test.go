package tests

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"testing"

	"birdie-and-claire/internal/controllers"
	"birdie-and-claire/internal/models"

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

// stylePreferencesProbe accepts what the replace-style-preferences route accepts.
func stylePreferencesProbe(t *testing.T) humatest.TestAPI {
	t.Helper()

	_, api := humatest.New(t)
	huma.Register(api, huma.Operation{
		OperationID: "style-preferences-probe",
		Method:      http.MethodPut,
		Path:        "/probe",
	}, func(_ context.Context, _ *controllers.UpdateStylePreferencesInput) (*struct{}, error) {
		return &struct{}{}, nil
	})

	return api
}

// withField returns valid preferences with one field set to value.
func withField(field string, value any) map[string]any {
	preferences := map[string]any{"style": []string{}, "neckline": []string{}, "bottoms": []string{}, "shoes": []string{}}
	preferences[field] = value
	return preferences
}

func TestUpdateStylePreferencesInput(t *testing.T) {
	tests := []struct {
		name       string
		body       map[string]any
		wantStatus int
	}{
		{name: "all four", body: withField("bottoms", []string{"pants", "skirt"}), wantStatus: http.StatusNoContent},
		{name: "missing field", body: map[string]any{"style": []string{}, "neckline": []string{}, "bottoms": []string{}}, wantStatus: http.StatusUnprocessableEntity},
		{name: "null field", body: withField("bottoms", nil), wantStatus: http.StatusUnprocessableEntity},
		{name: "unknown value", body: withField("neckline", []string{"plunging"}), wantStatus: http.StatusUnprocessableEntity},
		{name: "duplicate value", body: withField("shoes", []string{"heels", "heels"}), wantStatus: http.StatusUnprocessableEntity},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			response := stylePreferencesProbe(t).Put("/probe", test.body)
			if response.Code != test.wantStatus {
				t.Fatalf("status = %d, want %d: %s", response.Code, test.wantStatus, response.Body)
			}
		})
	}
}

func TestStylePreferencesValueKeepsEmptyLists(t *testing.T) {
	preferences := models.StylePreferences{Style: []string{"chic_avant_garde"}, Neckline: []string{}, Bottoms: []string{"pants"}, Shoes: []string{}}

	value, err := preferences.Value()
	if err != nil {
		t.Fatalf("value: %v", err)
	}
	want := `{"style":["chic_avant_garde"],"neckline":[],"bottoms":["pants"],"shoes":[]}`
	if value != want {
		t.Fatalf("value = %v, want %s", value, want)
	}
}
