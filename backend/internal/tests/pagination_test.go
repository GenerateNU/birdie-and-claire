package tests

import (
	"context"
	"net/http"
	"strings"
	"testing"

	"example_project/internal/utils/pagination"

	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/humatest"
)

// Locks the wire format; changing these bytes breaks clients mid-page.
func TestEncodeMatchesPublishedCursor(t *testing.T) {
	cursor, err := pagination.CursorFields{"id": 2}.Encode()
	if err != nil {
		t.Fatalf("Encode() error = %v", err)
	}
	if want := "eyJpZCI6Mn0"; cursor != want {
		t.Fatalf("Encode() = %q, want %q", cursor, want)
	}
}

func TestDecodeEmptyCursorIsFirstPage(t *testing.T) {
	fields, err := pagination.Decode("")
	if err != nil {
		t.Fatalf("Decode(\"\") error = %v", err)
	}

	id, err := fields.Int64("id")
	if err != nil {
		t.Fatalf("Int64() error = %v, want nil", err)
	}
	if id != nil {
		t.Fatalf("Int64() = %d, want nil", *id)
	}
}

func TestDecodeRejects(t *testing.T) {
	tests := []struct {
		name   string
		cursor string
	}{
		{name: "not base64", cursor: "not-valid-base64!!!"},
		{name: "not json", cursor: "bm90IGpzb24"},
		{name: "json array", cursor: "WzEsMl0"},
		{name: "json null", cursor: "bnVsbA"},
		{name: "empty object", cursor: "e30"},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if _, err := pagination.Decode(test.cursor); err == nil {
				t.Fatalf("Decode(%q) error = nil, want ErrBadCursor", test.cursor)
			}
		})
	}
}

func TestDecodeRoundTrip(t *testing.T) {
	cursor, err := pagination.CursorFields{"power_level": 92, "id": 7}.Encode()
	if err != nil {
		t.Fatalf("Encode() error = %v", err)
	}

	fields, err := pagination.Decode(cursor)
	if err != nil {
		t.Fatalf("Decode() error = %v", err)
	}

	powerLevel, err := fields.Int64("power_level")
	if err != nil || powerLevel == nil || *powerLevel != 92 {
		t.Fatalf("Int64(\"power_level\") = (%v, %v), want (92, nil)", powerLevel, err)
	}

	id, err := fields.Int64("id")
	if err != nil || id == nil || *id != 7 {
		t.Fatalf("Int64(\"id\") = (%v, %v), want (7, nil)", id, err)
	}
}

// Guards UseNumber in Decode: float64 cannot hold this id, so paging would slip a row.
func TestInt64PreservesLargeIDs(t *testing.T) {
	const want int64 = 9007199254740993

	cursor, err := pagination.CursorFields{"id": want}.Encode()
	if err != nil {
		t.Fatalf("Encode() error = %v", err)
	}

	fields, err := pagination.Decode(cursor)
	if err != nil {
		t.Fatalf("Decode() error = %v", err)
	}

	id, err := fields.Int64("id")
	if err != nil || id == nil {
		t.Fatalf("Int64(\"id\") = (%v, %v), want a value", id, err)
	}
	if *id != want {
		t.Fatalf("Int64(\"id\") = %d, want %d", *id, want)
	}
}

func TestInt64Rejects(t *testing.T) {
	tests := []struct {
		name   string
		cursor string
		key    string
	}{
		// A cursor naming only part of a multi-column key cannot build a comparison.
		{name: "partial cursor", cursor: "eyJwb3dlcl9sZXZlbCI6OTJ9", key: "id"},
		{name: "wrong type", cursor: "eyJpZCI6ImFiYyJ9", key: "id"},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			fields, err := pagination.Decode(test.cursor)
			if err != nil {
				t.Fatalf("Decode() error = %v", err)
			}

			if _, err := fields.Int64(test.key); err == nil {
				t.Fatalf("Int64(%q) error = nil, want ErrBadCursor", test.key)
			}
		})
	}
}

func TestSplit(t *testing.T) {
	tests := []struct {
		name        string
		limit       int
		wantItems   int
		wantHasMore bool
	}{
		{name: "more rows than limit", limit: 2, wantItems: 2, wantHasMore: true},
		{name: "rows equal limit", limit: 3, wantItems: 3, wantHasMore: false},
		{name: "fewer rows than limit", limit: 10, wantItems: 3, wantHasMore: false},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			items, hasMore := pagination.Split([]int{1, 2, 3}, test.limit)
			if len(items) != test.wantItems || hasMore != test.wantHasMore {
				t.Fatalf("Split() = (%v, %v), want (%d items, %v)", items, hasMore, test.wantItems, test.wantHasMore)
			}
		})
	}
}

type paginationProbeInput struct {
	pagination.CursorParams
}

type paginationProbeOutput struct {
	Body struct {
		Limit int    `json:"limit"`
		After *int64 `json:"after"`
	}
}

// paginationProbe reports what CursorParams resolved to, through the real Huma pipeline:
// whether Huma reaches a resolver on an embedded struct is the thing being pinned.
func paginationProbe(t *testing.T) humatest.TestAPI {
	t.Helper()

	_, api := humatest.New(t)
	huma.Register(api, huma.Operation{
		OperationID: "pagination-probe",
		Method:      http.MethodGet,
		Path:        "/probe",
	}, func(_ context.Context, input *paginationProbeInput) (*paginationProbeOutput, error) {
		after, err := input.After().Int64("id")
		if err != nil {
			return nil, err
		}

		output := &paginationProbeOutput{}

		output.Body.Limit = input.Limit
		output.Body.After = after

		return output, nil
	})

	return api
}

func TestResolveDecodesCursorAtTheBoundary(t *testing.T) {
	response := paginationProbe(t).Get("/probe?cursor=eyJpZCI6Mn0")
	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d: %s", response.Code, http.StatusOK, response.Body)
	}
	if want := `"after":2`; !strings.Contains(response.Body.String(), want) {
		t.Fatalf("body = %s, want it to contain %s", response.Body, want)
	}
}

func TestResolveRejectsBadCursor(t *testing.T) {
	response := paginationProbe(t).Get("/probe?cursor=not-valid-base64!!!")
	if response.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d: %s", response.Code, http.StatusBadRequest, response.Body)
	}
}

func TestLimitBounds(t *testing.T) {
	tests := []struct {
		name  string
		query string
		want  int
	}{
		{name: "default", query: "", want: http.StatusOK},
		{name: "minimum", query: "?limit=1", want: http.StatusOK},
		{name: "maximum", query: "?limit=100", want: http.StatusOK},
		{name: "zero", query: "?limit=0", want: http.StatusUnprocessableEntity},
		{name: "negative", query: "?limit=-1", want: http.StatusUnprocessableEntity},
		{name: "above maximum", query: "?limit=101", want: http.StatusUnprocessableEntity},
		{name: "not a number", query: "?limit=many", want: http.StatusUnprocessableEntity},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			response := paginationProbe(t).Get("/probe" + test.query)
			if response.Code != test.want {
				t.Fatalf("status = %d, want %d: %s", response.Code, test.want, response.Body)
			}
		})
	}
}

func TestDefaultLimitIsTwenty(t *testing.T) {
	response := paginationProbe(t).Get("/probe")
	if want := `"limit":20`; !strings.Contains(response.Body.String(), want) {
		t.Fatalf("body = %s, want it to contain %s", response.Body, want)
	}
}
