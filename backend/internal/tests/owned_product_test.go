package tests

import (
	"context"
	"database/sql"
	"math/rand/v2"
	"net/http"
	"slices"
	"strings"
	"testing"
	"time"

	"birdie-and-claire/internal/auth"
	"birdie-and-claire/internal/config"
	"birdie-and-claire/internal/controllers"
	"birdie-and-claire/internal/errs"
	"birdie-and-claire/internal/models"
	"birdie-and-claire/internal/repository"
	"birdie-and-claire/internal/server"
	"birdie-and-claire/internal/services"
	"birdie-and-claire/internal/utils/pagination"

	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/humatest"
	"github.com/google/uuid"
)

type addPiecesProbeInput struct {
	controllers.AddOwnedProductsInput
}

type addPiecesProbeOutput struct {
	Body struct {
		ProductCount int `json:"product_count"`
	}
}

// addPiecesProbe reports what AddOwnedProductsInput let through, via the real Huma pipeline,
// so struct-tag validation and Resolve both run without a database behind them.
func addPiecesProbe(t *testing.T) humatest.TestAPI {
	t.Helper()

	_, api := humatest.New(t, server.APIConfig(&config.Configuration{}))
	huma.Register(api, huma.Operation{
		OperationID: "add-pieces-probe",
		Method:      http.MethodPost,
		Path:        "/probe",
	}, func(_ context.Context, input *addPiecesProbeInput) (*addPiecesProbeOutput, error) {
		output := &addPiecesProbeOutput{}
		output.Body.ProductCount = len(input.Body.ProductIDs)
		return output, nil
	})
	return api
}

func newProductIDs(count int) []string {
	ids := make([]string, count)
	for i := range ids {
		ids[i] = uuid.NewString()
	}
	return ids
}

func TestAddPiecesValidatesProductIDs(t *testing.T) {
	tests := []struct {
		name       string
		body       map[string]any
		wantStatus int
	}{
		{name: "one", body: map[string]any{"product_ids": newProductIDs(1)}, wantStatus: http.StatusOK},
		{name: "fifty", body: map[string]any{"product_ids": newProductIDs(50)}, wantStatus: http.StatusOK},
		{name: "fifty one", body: map[string]any{"product_ids": newProductIDs(51)}, wantStatus: http.StatusUnprocessableEntity},
		{name: "empty", body: map[string]any{"product_ids": []string{}}, wantStatus: http.StatusUnprocessableEntity},
		{name: "missing", body: map[string]any{}, wantStatus: http.StatusUnprocessableEntity},
		{name: "duplicate in another case", body: map[string]any{"product_ids": []string{productIDLower, productIDUpper}}, wantStatus: http.StatusBadRequest},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			response := addPiecesProbe(t).Post("/probe", test.body)
			if response.Code != test.wantStatus {
				t.Fatalf("status = %d, want %d: %s", response.Code, test.wantStatus, response.Body)
			}
		})
	}
}

// A key in another casing is not the field, so only the exact key is validated and decoded.
func TestAddPiecesIgnoresKeysInDifferentCasing(t *testing.T) {
	tests := []struct {
		name string
		body string
	}{
		{name: "empty PRODUCT_IDS beside product_ids", body: `{"product_ids": ["` + productIDLower + `"], "PRODUCT_IDS": []}`},
		{name: "longer PRODUCT_IDS beside product_ids", body: `{"product_ids": ["` + productIDLower + `"], "PRODUCT_IDS": ["` + productIDOther + `", "` + productIDUpper + `"]}`},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			response := addPiecesProbe(t).Post("/probe", strings.NewReader(test.body))
			if response.Code != http.StatusOK {
				t.Fatalf("status = %d, want %d: %s", response.Code, http.StatusOK, response.Body)
			}
			if !strings.Contains(response.Body.String(), `"product_count":1`) {
				t.Fatalf("body = %s, want only the exact key's one product", response.Body)
			}
		})
	}
}

// Huma validates and decodes the body in two passes, so a repeated key has to fail the decode instead of picking a winner.
func TestAddPiecesRejectsRepeatedKeys(t *testing.T) {
	body := `{"product_ids": ["` + productIDLower + `"], "product_ids": []}`

	response := addPiecesProbe(t).Post("/probe", strings.NewReader(body))
	if response.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d: %s", response.Code, http.StatusBadRequest, response.Body)
	}
	if !strings.Contains(response.Body.String(), "duplicate object member name") {
		t.Fatalf("body = %s, want it to name the duplicate key", response.Body)
	}
}

// insertTestProductAt inserts a product with the given created_at, to control where it sorts in the catalog.
func insertTestProductAt(t *testing.T, db *sql.DB, createdAt time.Time) uuid.UUID {
	t.Helper()

	var id uuid.UUID
	err := db.QueryRowContext(context.Background(), `
		INSERT INTO products (shopify_id, handle, title, slot, created_at)
		VALUES ($1, 'test-product', 'Test product', 'top', $2)
		RETURNING id
	`, rand.Int64(), createdAt).Scan(&id)
	if err != nil {
		t.Fatalf("insert product: %v", err)
	}
	t.Cleanup(func() { _, _ = db.Exec(`DELETE FROM products WHERE id = $1`, id) })
	return id
}

// cursorParams decodes cursor the way Huma does at the boundary.
func cursorParams(t *testing.T, limit int, cursor string) pagination.CursorParams {
	t.Helper()

	params := pagination.CursorParams{Limit: limit, Cursor: cursor}
	if errs := params.Resolve(nil); len(errs) > 0 {
		t.Fatalf("resolve cursor: %v", errs)
	}
	return params
}

func ownedIDs(products []models.OwnedProductResponse) []uuid.UUID {
	ids := make([]uuid.UUID, 0, len(products))
	for _, product := range products {
		ids = append(ids, product.ID)
	}
	return ids
}

func productIDs(products []models.ProductResponse) []uuid.UUID {
	ids := make([]uuid.UUID, 0, len(products))
	for _, product := range products {
		ids = append(ids, product.ID)
	}
	return ids
}

// Each Add is its own statement, so each gets a later now() and the list order is the add order reversed.
func TestPiecesListMostRecentlyAddedFirstAcrossPages(t *testing.T) {
	db := openTestDB(t)
	userID := insertTestUser(t, db)
	ctx := auth.WithUserID(context.Background(), userID)
	service := services.NewOwnedProductService(repository.New(db))
	first, second, third := insertTestProduct(t, db), insertTestProduct(t, db), insertTestProduct(t, db)

	for _, productID := range []uuid.UUID{first, second, third} {
		if err := service.AddOwnedProducts(ctx, []uuid.UUID{productID}); err != nil {
			t.Fatalf("add %s: %v", productID, err)
		}
	}

	page, err := service.ListOwnedProducts(ctx, cursorParams(t, 2, ""))
	if err != nil {
		t.Fatalf("list first page: %v", err)
	}
	if got := ownedIDs(page.Items); !slices.Equal(got, []uuid.UUID{third, second}) || !page.HasMore || page.NextCursor == nil {
		t.Fatalf("first page = %v, has_more %v, cursor %v; want [third second] and more", got, page.HasMore, page.NextCursor)
	}

	page, err = service.ListOwnedProducts(ctx, cursorParams(t, 2, *page.NextCursor))
	if err != nil {
		t.Fatalf("list second page: %v", err)
	}
	if got := ownedIDs(page.Items); !slices.Equal(got, []uuid.UUID{first}) || page.HasMore || page.NextCursor != nil {
		t.Fatalf("second page = %v, has_more %v; want [first] and no more", got, page.HasMore)
	}
	if page.Items[0].AddedAt.IsZero() || page.Items[0].Title != "Test product" {
		t.Errorf("item = %+v, want the product's fields and when it was added", page.Items[0])
	}
}

func TestPiecesAddIsIdempotentAndScopedToTheUser(t *testing.T) {
	db := openTestDB(t)
	repo := repository.New(db).OwnedProduct
	owner, other := insertTestUser(t, db), insertTestUser(t, db)
	owned, alsoOwned := insertTestProduct(t, db), insertTestProduct(t, db)
	ctx := context.Background()

	if err := repo.AddOwnedProducts(ctx, owner, []uuid.UUID{owned}); err != nil {
		t.Fatalf("add: %v", err)
	}
	before, err := repo.ListOwnedProducts(ctx, owner, cursorParams(t, 10, ""))
	if err != nil {
		t.Fatalf("list: %v", err)
	}

	// One already owned, one new: the owned one keeps its added_at, the new one is added.
	if err := repo.AddOwnedProducts(ctx, owner, []uuid.UUID{owned, alsoOwned}); err != nil {
		t.Fatalf("add again: %v", err)
	}
	after, err := repo.ListOwnedProducts(ctx, owner, cursorParams(t, 10, ""))
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if got := ownedIDs(after.Items); !slices.Equal(got, []uuid.UUID{alsoOwned, owned}) {
		t.Fatalf("pieces = %v, want [alsoOwned owned]", got)
	}
	if !after.Items[1].AddedAt.Equal(before.Items[0].AddedAt) {
		t.Errorf("re-adding moved added_at from %v to %v", before.Items[0].AddedAt, after.Items[1].AddedAt)
	}

	otherPieces, err := repo.ListOwnedProducts(ctx, other, cursorParams(t, 10, ""))
	if err != nil {
		t.Fatalf("list other user: %v", err)
	}
	if len(otherPieces.Items) != 0 {
		t.Errorf("other user's pieces = %v, want none", ownedIDs(otherPieces.Items))
	}
}

func TestPiecesAddForeignKeyViolations(t *testing.T) {
	db := openTestDB(t)
	repo := repository.New(db).OwnedProduct
	ctx := context.Background()
	productID := insertTestProduct(t, db)
	userID := insertTestUser(t, db)

	tests := []struct {
		name       string
		userID     uuid.UUID
		productIDs []uuid.UUID
		want       int
	}{
		{name: "unknown user", userID: uuid.New(), productIDs: []uuid.UUID{productID}, want: http.StatusNotFound},
		{name: "unknown product", userID: userID, productIDs: []uuid.UUID{productID, uuid.New()}, want: http.StatusConflict},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			err := repo.AddOwnedProducts(ctx, test.userID, test.productIDs)
			if got := statusOf(t, errs.ToHuma(ctx, err)); got != test.want {
				t.Fatalf("status = %d, want %d: %v", got, test.want, err)
			}
		})
	}

	// One statement, so the known product in the failed request was not added either.
	pieces, err := repo.ListOwnedProducts(ctx, userID, cursorParams(t, 10, ""))
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(pieces.Items) != 0 {
		t.Errorf("pieces = %v, want none after the failed add", ownedIDs(pieces.Items))
	}
}

func TestPiecesRemove(t *testing.T) {
	db := openTestDB(t)
	repo := repository.New(db).OwnedProduct
	ctx := context.Background()
	owner, other := insertTestUser(t, db), insertTestUser(t, db)
	productID := insertTestProduct(t, db)

	for _, userID := range []uuid.UUID{owner, other} {
		if err := repo.AddOwnedProducts(ctx, userID, []uuid.UUID{productID}); err != nil {
			t.Fatalf("add: %v", err)
		}
	}

	if err := repo.RemoveOwnedProduct(ctx, owner, productID); err != nil {
		t.Fatalf("remove: %v", err)
	}
	if got := statusOf(t, errs.ToHuma(ctx, repo.RemoveOwnedProduct(ctx, owner, productID))); got != http.StatusNotFound {
		t.Errorf("removing again: status = %d, want %d", got, http.StatusNotFound)
	}

	otherPieces, err := repo.ListOwnedProducts(ctx, other, cursorParams(t, 10, ""))
	if err != nil {
		t.Fatalf("list other user: %v", err)
	}
	if got := ownedIDs(otherPieces.Items); !slices.Equal(got, []uuid.UUID{productID}) {
		t.Errorf("other user's pieces = %v, want the product still there", got)
	}
}

func TestPiecesCascadeWithUserAndProduct(t *testing.T) {
	db := openTestDB(t)
	repo := repository.New(db).OwnedProduct
	ctx := context.Background()
	userID := insertTestUser(t, db)
	keptProduct, deletedProduct := insertTestProduct(t, db), insertTestProduct(t, db)

	if err := repo.AddOwnedProducts(ctx, userID, []uuid.UUID{keptProduct, deletedProduct}); err != nil {
		t.Fatalf("add: %v", err)
	}

	if _, err := db.ExecContext(ctx, `DELETE FROM products WHERE id = $1`, deletedProduct); err != nil {
		t.Fatalf("delete product: %v", err)
	}
	pieces, err := repo.ListOwnedProducts(ctx, userID, cursorParams(t, 10, ""))
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if got := ownedIDs(pieces.Items); !slices.Equal(got, []uuid.UUID{keptProduct}) {
		t.Fatalf("pieces after deleting a product = %v, want [keptProduct]", got)
	}

	if _, err := db.ExecContext(ctx, `DELETE FROM users WHERE id = $1`, userID); err != nil {
		t.Fatalf("delete user: %v", err)
	}
	var remaining int
	if err := db.QueryRowContext(ctx, `SELECT count(*) FROM owned_products WHERE user_id = $1`, userID).Scan(&remaining); err != nil {
		t.Fatalf("count owned products: %v", err)
	}
	if remaining != 0 {
		t.Errorf("owned products after deleting the user = %d, want 0", remaining)
	}
}

// The test products sit far in the future, so they lead the catalog regardless of what else is in it.
func TestProductsListNewestFirstWithoutOwnedAcrossPages(t *testing.T) {
	db := openTestDB(t)
	userID := insertTestUser(t, db)
	ctx := auth.WithUserID(context.Background(), userID)
	future := time.Now().AddDate(100, 0, 0)
	newest := insertTestProductAt(t, db, future.Add(3*time.Hour))
	owned := insertTestProductAt(t, db, future.Add(2*time.Hour))
	older := insertTestProductAt(t, db, future.Add(time.Hour))

	if err := repository.New(db).OwnedProduct.AddOwnedProducts(context.Background(), userID, []uuid.UUID{owned}); err != nil {
		t.Fatalf("add owned: %v", err)
	}
	service := services.NewProductService(repository.New(db))

	page, err := service.ListUnownedProducts(ctx, cursorParams(t, 1, ""))
	if err != nil {
		t.Fatalf("list first page: %v", err)
	}
	if got := productIDs(page.Items); !slices.Equal(got, []uuid.UUID{newest}) || !page.HasMore || page.NextCursor == nil {
		t.Fatalf("first page = %v, has_more %v; want [newest] and more", got, page.HasMore)
	}

	page, err = service.ListUnownedProducts(ctx, cursorParams(t, 1, *page.NextCursor))
	if err != nil {
		t.Fatalf("list second page: %v", err)
	}
	if got := productIDs(page.Items); !slices.Equal(got, []uuid.UUID{older}) {
		t.Fatalf("second page = %v, want [older], skipping the owned product", got)
	}
	if strings.TrimSpace(page.Items[0].Title) == "" {
		t.Errorf("item = %+v, want the product's fields", page.Items[0])
	}
}
