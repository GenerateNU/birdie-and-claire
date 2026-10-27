package tests

import (
	"context"
	"database/sql"
	"net/http"
	"slices"
	"strings"
	"testing"

	"birdie-and-claire/internal/auth"
	"birdie-and-claire/internal/controllers"
	"birdie-and-claire/internal/errs"
	"birdie-and-claire/internal/models"
	"birdie-and-claire/internal/repository"
	"birdie-and-claire/internal/services"

	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/humatest"
	"github.com/google/uuid"
)

func suggestionsProbe(t *testing.T) humatest.TestAPI {
	t.Helper()

	_, api := humatest.New(t)
	huma.Register(api, huma.Operation{
		OperationID: "suggest-outfit-items-probe",
		Method:      http.MethodGet,
		Path:        "/probe/{id}/suggestions",
	}, func(_ context.Context, input *controllers.SuggestOutfitItemsInput) (*struct{ Body int }, error) {
		return &struct{ Body int }{Body: input.Limit}, nil
	})
	return api
}

func TestSuggestOutfitItemsInputBounds(t *testing.T) {
	tests := []struct {
		name  string
		query string
		want  int
	}{
		{name: "default limit", query: "", want: http.StatusOK},
		{name: "minimum 1", query: "&limit=1", want: http.StatusOK},
		{name: "maximum 30", query: "&limit=30", want: http.StatusOK},
		{name: "below minimum 0", query: "&limit=0", want: http.StatusUnprocessableEntity},
		{name: "above maximum 31", query: "&limit=31", want: http.StatusUnprocessableEntity},
		{name: "not a number", query: "&limit=many", want: http.StatusUnprocessableEntity},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			response := suggestionsProbe(t).Get("/probe/" + uuid.NewString() + "/suggestions?product_id=" + productIDLower + test.query)
			if response.Code != test.want {
				t.Fatalf("status = %d, want %d: %s", response.Code, test.want, response.Body)
			}
		})
	}
}

func TestSuggestOutfitItemsDefaultsLimitTo12(t *testing.T) {
	response := suggestionsProbe(t).Get("/probe/" + uuid.NewString() + "/suggestions?product_id=" + productIDLower)
	if strings.TrimSpace(response.Body.String()) != "12" {
		t.Fatalf("limit = %s, want 12", response.Body)
	}
}

func TestSuggestOutfitItemsRequiresProductID(t *testing.T) {
	response := suggestionsProbe(t).Get("/probe/" + uuid.NewString() + "/suggestions")
	if response.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status = %d, want %d: %s", response.Code, http.StatusUnprocessableEntity, response.Body)
	}
}

func newSuggestionService(db *sql.DB) services.OutfitService {
	return services.NewOutfitService(repository.New(db), "")
}

// insertSuggestionOutfit saves an outfit of the given products for a new user.
func insertSuggestionOutfit(t *testing.T, db *sql.DB, productIDs ...uuid.UUID) (outfitID, ownerID uuid.UUID) {
	t.Helper()

	ownerID = insertTestUser(t, db)
	outfit, _, err := repository.NewOutfitRepository(db).Create(context.Background(), models.CreateOutfitParams{Name: "fit", ProductIDs: productIDs}, ownerID)
	if err != nil {
		t.Fatalf("create outfit: %v", err)
	}
	// outfit_products.outfit_id has no ON DELETE CASCADE, so its rows go first.
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM outfit_products WHERE outfit_id = $1`, outfit.ID)
		_, _ = db.Exec(`DELETE FROM outfits WHERE id = $1`, outfit.ID)
	})
	return outfit.ID, ownerID
}

func TestSuggestNonOwnerAndMissingOutfitReturnNotFound(t *testing.T) {
	db := openTestDB(t)
	service := newSuggestionService(db)
	product := insertSlotProduct(t, db, testProduct{slot: models.SlotTop, embedding: productEmbedding(0.1)})
	outfitID, _ := insertSuggestionOutfit(t, db, product)
	strangerID := insertTestUser(t, db)

	tests := []struct {
		name     string
		outfitID uuid.UUID
	}{
		{name: "not the owner", outfitID: outfitID},
		{name: "nonexistent outfit", outfitID: uuid.New()},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			ctx := auth.WithUserID(context.Background(), strangerID)
			_, err := service.Suggest(ctx, test.outfitID, product, 12)
			wantNotFound(t, err)
		})
	}
}

func TestSuggestProductOutsideOutfitIsUnprocessable(t *testing.T) {
	db := openTestDB(t)
	service := newSuggestionService(db)
	inOutfit := insertSlotProduct(t, db, testProduct{slot: models.SlotTop, embedding: productEmbedding(0.1)})
	outside := insertSlotProduct(t, db, testProduct{slot: models.SlotTop, embedding: productEmbedding(0.2)})
	outfitID, ownerID := insertSuggestionOutfit(t, db, inOutfit)

	_, err := service.Suggest(auth.WithUserID(context.Background(), ownerID), outfitID, outside, 12)

	humaErr := errs.ToHuma(context.Background(), err)
	if got := statusOf(t, humaErr); got != http.StatusUnprocessableEntity {
		t.Fatalf("status = %d, want %d: %v", got, http.StatusUnprocessableEntity, err)
	}
	if !strings.Contains(humaErr.Error(), "product is not in this outfit") {
		t.Fatalf("error = %v, want the reason in it", humaErr)
	}
}

func TestSuggestWithoutEmbeddingReturnsEmptyList(t *testing.T) {
	db := openTestDB(t)
	logs := captureLogs(t)
	service := newSuggestionService(db)
	noEmbedding := insertSlotProduct(t, db, testProduct{slot: models.SlotTop})
	insertSlotProduct(t, db, testProduct{slot: models.SlotTop, embedding: productEmbedding(0.1)})
	outfitID, ownerID := insertSuggestionOutfit(t, db, noEmbedding)

	got, err := service.Suggest(auth.WithUserID(context.Background(), ownerID), outfitID, noEmbedding, 12)
	if err != nil {
		t.Fatalf("Suggest: %v", err)
	}
	if got.Products == nil || len(got.Products) != 0 {
		t.Fatalf("products = %v, want a non-nil empty list", got.Products)
	}
	if !strings.Contains(logs.String(), `"level":"WARN"`) {
		t.Fatalf("logs = %s, want a warning", logs)
	}
}

func TestSuggestNeverReturnsTheOutfitsProducts(t *testing.T) {
	db := openTestDB(t)
	service := newSuggestionService(db)
	anchor := insertSlotProduct(t, db, testProduct{slot: models.SlotTop, embedding: productEmbedding(0)})
	// the sibling is the second-closest top, so only the exclusion keeps it out
	sibling := insertSlotProduct(t, db, testProduct{slot: models.SlotTop, embedding: productEmbedding(0.05)})
	near := insertSlotProduct(t, db, testProduct{slot: models.SlotTop, embedding: productEmbedding(0.1)})
	far := insertSlotProduct(t, db, testProduct{slot: models.SlotTop, embedding: productEmbedding(0.2)})
	otherSlot := insertSlotProduct(t, db, testProduct{slot: models.SlotBottom, embedding: productEmbedding(0.1)})
	outfitID, ownerID := insertSuggestionOutfit(t, db, anchor, sibling)
	ownIDs := []uuid.UUID{anchor, sibling, near, far, otherSlot}

	got, err := service.Suggest(auth.WithUserID(context.Background(), ownerID), outfitID, anchor, 30)
	if err != nil {
		t.Fatalf("Suggest: %v", err)
	}
	var ids []uuid.UUID
	for _, product := range got.Products {
		if slices.Contains(ownIDs, product.ID) {
			ids = append(ids, product.ID)
		}
	}
	if want := []uuid.UUID{near, far}; !slices.Equal(ids, want) {
		t.Fatalf("own products returned = %v, want %v, closest first", ids, want)
	}
}

func TestSuggestRespectsLimit(t *testing.T) {
	db := openTestDB(t)
	service := newSuggestionService(db)
	anchor := insertSlotProduct(t, db, testProduct{slot: models.SlotTop, embedding: productEmbedding(0)})
	insertSlotProduct(t, db, testProduct{slot: models.SlotTop, embedding: productEmbedding(0.1)})
	insertSlotProduct(t, db, testProduct{slot: models.SlotTop, embedding: productEmbedding(0.2)})
	outfitID, ownerID := insertSuggestionOutfit(t, db, anchor)

	got, err := service.Suggest(auth.WithUserID(context.Background(), ownerID), outfitID, anchor, 1)
	if err != nil {
		t.Fatalf("Suggest: %v", err)
	}
	if len(got.Products) != 1 {
		t.Fatalf("got %d products, want 1", len(got.Products))
	}
}
