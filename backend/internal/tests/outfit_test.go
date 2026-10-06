package tests

import (
	"context"
	"net/http"
	"strings"
	"testing"

	"birdie-and-claire/internal/controllers"

	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/humatest"
)

const (
	productIDLower = "aaaaaaaa-1111-1111-1111-111111111111"
	productIDUpper = "AAAAAAAA-1111-1111-1111-111111111111"
	productIDOther = "bbbbbbbb-1111-1111-1111-111111111111"
)

type outfitProbeInput struct {
	controllers.CreateOutfitInput
}

type outfitProbeOutput struct {
	Body struct {
		NameLength   int `json:"name_length"`
		ProductCount int `json:"product_count"`
	}
}

// outfitProbe reports what CreateOutfitInput let through, via the real Huma pipeline,
// so struct-tag validation and Resolve both run without a database behind them.
func outfitProbe(t *testing.T) humatest.TestAPI {
	t.Helper()

	_, api := humatest.New(t)
	huma.Register(api, huma.Operation{
		OperationID: "outfit-probe",
		Method:      http.MethodPost,
		Path:        "/probe",
	}, func(_ context.Context, input *outfitProbeInput) (*outfitProbeOutput, error) {
		output := &outfitProbeOutput{}

		output.Body.NameLength = len(input.Body.Name)
		output.Body.ProductCount = len(input.Body.ProductIDs)

		return output, nil
	})

	return api
}

func createOutfitBody(name string, productIDs ...string) map[string]any {
	return map[string]any{"name": name, "product_ids": productIDs}
}

// Different casing parses to the same UUID, so this is still a duplicate.
func TestResolveRejectsCaseVariedDuplicateProductIDs(t *testing.T) {
	response := outfitProbe(t).Post("/probe", createOutfitBody("fit", productIDUpper, productIDLower))
	if response.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d: %s", response.Code, http.StatusBadRequest, response.Body)
	}
	if want := "duplicate product id"; !strings.Contains(response.Body.String(), want) {
		t.Fatalf("body = %s, want it to contain %s", response.Body, want)
	}
}

func TestProductIDUniqueness(t *testing.T) {
	tests := []struct {
		name       string
		productIDs []string
		want       int
		wantBody   string
	}{
		{name: "exact duplicate", productIDs: []string{productIDLower, productIDLower}, want: http.StatusBadRequest, wantBody: "duplicate product id"},
		{name: "two distinct ids", productIDs: []string{productIDLower, productIDOther}, want: http.StatusOK},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			response := outfitProbe(t).Post("/probe", createOutfitBody("fit", test.productIDs...))
			if response.Code != test.want {
				t.Fatalf("status = %d, want %d: %s", response.Code, test.want, response.Body)
			}
			if !strings.Contains(response.Body.String(), test.wantBody) {
				t.Fatalf("body = %s, want it to contain %s", response.Body, test.wantBody)
			}
		})
	}
}

func TestOutfitNameBounds(t *testing.T) {
	tests := []struct {
		name       string
		outfitName string
		want       int
	}{
		{name: "empty", outfitName: "", want: http.StatusUnprocessableEntity},
		{name: "maximum 100 characters", outfitName: strings.Repeat("n", 100), want: http.StatusOK},
		{name: "above maximum 101 characters", outfitName: strings.Repeat("n", 101), want: http.StatusUnprocessableEntity},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			response := outfitProbe(t).Post("/probe", createOutfitBody(test.outfitName, productIDLower))
			if response.Code != test.want {
				t.Fatalf("status = %d, want %d: %s", response.Code, test.want, response.Body)
			}
		})
	}
}
