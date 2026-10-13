package tests

import (
	"context"
	"database/sql"
	"math/rand/v2"
	"net/http"
	"strings"
	"testing"

	"birdie-and-claire/internal/config"
	"birdie-and-claire/internal/controllers"
	"birdie-and-claire/internal/database"
	"birdie-and-claire/internal/errs"
	"birdie-and-claire/internal/models"
	"birdie-and-claire/internal/repository"

	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/humatest"
	"github.com/google/uuid"
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

// openTestDB connects to DATABASE_URL, skipping the test when it is not set.
func openTestDB(t *testing.T) *sql.DB {
	t.Helper()

	cfg, err := config.LoadDatabase()
	if err != nil {
		t.Skip("DATABASE_URL not set")
	}
	db, err := database.Open(context.Background(), cfg)
	if err != nil {
		t.Fatalf("open database: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	return db
}

func insertTestProduct(t *testing.T, db *sql.DB) uuid.UUID {
	t.Helper()

	var id uuid.UUID
	err := db.QueryRowContext(context.Background(), `
		INSERT INTO products (shopify_id, handle, title)
		VALUES ($1, 'test-product', 'Test product')
		RETURNING id
	`, rand.Int64()).Scan(&id)
	if err != nil {
		t.Fatalf("insert product: %v", err)
	}
	t.Cleanup(func() { _, _ = db.Exec(`DELETE FROM products WHERE id = $1`, id) })
	return id
}

func insertTestUser(t *testing.T, db *sql.DB) uuid.UUID {
	t.Helper()

	id := uuid.New()
	if _, err := db.ExecContext(context.Background(), `INSERT INTO users (id) VALUES ($1)`, id); err != nil {
		t.Fatalf("insert user: %v", err)
	}
	t.Cleanup(func() { _, _ = db.Exec(`DELETE FROM users WHERE id = $1`, id) })
	return id
}

// Saving an outfit for a caller with no users row relies on the outfits.user_id foreign key to return 404.
func TestCreateOutfitWithoutAccountIsNotFound(t *testing.T) {
	db := openTestDB(t)
	ctx := context.Background()

	// No products, so the user foreign key is the only one that can fail.
	params := models.CreateOutfitParams{Name: "fit", ProductIDs: []uuid.UUID{}}
	_, _, err := repository.NewOutfitRepository(db).Create(ctx, params, uuid.New())
	if got := statusOf(t, errs.ToHuma(ctx, err)); got != http.StatusNotFound {
		t.Fatalf("status = %d, want %d: %v", got, http.StatusNotFound, err)
	}
}

// With a real product in the request, each foreign key still maps to its own client error.
func TestCreateOutfitForeignKeyViolations(t *testing.T) {
	db := openTestDB(t)
	ctx := context.Background()
	productID := insertTestProduct(t, db)

	tests := []struct {
		name       string
		userID     uuid.UUID
		productIDs []uuid.UUID
		want       int
	}{
		{name: "unknown user", userID: uuid.New(), productIDs: []uuid.UUID{productID}, want: http.StatusNotFound},
		{name: "unknown product", userID: insertTestUser(t, db), productIDs: []uuid.UUID{productID, uuid.New()}, want: http.StatusConflict},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			params := models.CreateOutfitParams{Name: "fit", ProductIDs: test.productIDs}
			_, _, err := repository.NewOutfitRepository(db).Create(ctx, params, test.userID)
			if got := statusOf(t, errs.ToHuma(ctx, err)); got != test.want {
				t.Fatalf("status = %d, want %d: %v", got, test.want, err)
			}
		})
	}
}
