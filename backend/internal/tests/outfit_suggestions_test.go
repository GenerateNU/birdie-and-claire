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

func TestSuggestOutfitItemsProductIDBounds(t *testing.T) {
	ids := func(count int) string {
		var query string
		for range count {
			query += "&product_id=" + uuid.NewString()
		}
		return "?" + query[1:]
	}
	tests := []struct {
		name  string
		query string
		want  int
	}{
		{name: "one id", query: ids(1), want: http.StatusOK},
		{name: "ten ids", query: ids(10), want: http.StatusOK},
		{name: "eleven ids", query: ids(11), want: http.StatusUnprocessableEntity},
		{name: "duplicate id", query: "?product_id=" + productIDLower + "&product_id=" + strings.ToUpper(productIDLower), want: http.StatusBadRequest},
		{name: "not a uuid", query: "?product_id=nope", want: http.StatusUnprocessableEntity},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			response := suggestionsProbe(t).Get("/probe/" + uuid.NewString() + "/suggestions" + test.query)
			if response.Code != test.want {
				t.Fatalf("status = %d, want %d: %s", response.Code, test.want, response.Body)
			}
		})
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
			_, err := service.Suggest(ctx, test.outfitID, []uuid.UUID{product}, 12)
			wantNotFound(t, err)
		})
	}
}

func TestSuggestAcceptsProductOutsideOutfit(t *testing.T) {
	db := openTestDB(t)
	service := newSuggestionService(db)
	inOutfit := insertSlotProduct(t, db, testProduct{slot: models.SlotTop, embedding: productEmbedding(0.1)})
	unsaved := insertSlotProduct(t, db, testProduct{slot: models.SlotTop, embedding: productEmbedding(0.2)})
	near := insertSlotProduct(t, db, testProduct{slot: models.SlotTop, embedding: productEmbedding(0.25)})
	outfitID, ownerID := insertSuggestionOutfit(t, db, inOutfit)

	got, err := service.Suggest(auth.WithUserID(context.Background(), ownerID), outfitID, []uuid.UUID{unsaved}, 30)
	if err != nil {
		t.Fatalf("Suggest: %v", err)
	}
	ids := suggestedIDs(got.Suggestions[unsaved], []uuid.UUID{inOutfit, unsaved, near})
	if want := []uuid.UUID{near}; !slices.Equal(ids, want) {
		t.Fatalf("own products returned = %v, want %v: the requested product and the saved outfit's are excluded", ids, want)
	}
}

func TestSuggestUnknownProductGetsErrorEntry(t *testing.T) {
	db := openTestDB(t)
	service := newSuggestionService(db)
	known := insertSlotProduct(t, db, testProduct{slot: models.SlotTop, embedding: productEmbedding(0.1)})
	unknown := uuid.New()
	outfitID, ownerID := insertSuggestionOutfit(t, db, known)

	got, err := service.Suggest(auth.WithUserID(context.Background(), ownerID), outfitID, []uuid.UUID{known, unknown}, 12)
	if err != nil {
		t.Fatalf("Suggest: %v", err)
	}
	entry, ok := got.Suggestions[unknown]
	if !ok || entry.Error != "product not in catalog" || entry.Products == nil || len(entry.Products) != 0 {
		t.Fatalf("entry = %+v, want an empty non-nil list and the catalog error", entry)
	}
	if got.Suggestions[known].Error != "" {
		t.Fatalf("known product error = %q, want none", got.Suggestions[known].Error)
	}
}

func TestSuggestAnswersEveryRequestedProduct(t *testing.T) {
	db := openTestDB(t)
	service := newSuggestionService(db)
	top := insertSlotProduct(t, db, testProduct{slot: models.SlotTop, embedding: productEmbedding(0)})
	bottom := insertSlotProduct(t, db, testProduct{slot: models.SlotBottom, embedding: productEmbedding(0)})
	nearTop := insertSlotProduct(t, db, testProduct{slot: models.SlotTop, embedding: productEmbedding(0.1)})
	nearBottom := insertSlotProduct(t, db, testProduct{slot: models.SlotBottom, embedding: productEmbedding(0.1)})
	outfitID, ownerID := insertSuggestionOutfit(t, db, top, bottom)
	ownIDs := []uuid.UUID{top, bottom, nearTop, nearBottom}

	got, err := service.Suggest(auth.WithUserID(context.Background(), ownerID), outfitID, []uuid.UUID{top, bottom}, 30)
	if err != nil {
		t.Fatalf("Suggest: %v", err)
	}
	if len(got.Suggestions) != 2 {
		t.Fatalf("got %d entries, want 2", len(got.Suggestions))
	}
	if ids, want := suggestedIDs(got.Suggestions[top], ownIDs), []uuid.UUID{nearTop}; !slices.Equal(ids, want) {
		t.Fatalf("top suggestions = %v, want %v", ids, want)
	}
	if ids, want := suggestedIDs(got.Suggestions[bottom], ownIDs), []uuid.UUID{nearBottom}; !slices.Equal(ids, want) {
		t.Fatalf("bottom suggestions = %v, want %v", ids, want)
	}
}

// suggestedIDs keeps only ownIDs, since seeded products can share the slot.
func suggestedIDs(entry models.ProductSuggestionsEntry, ownIDs []uuid.UUID) []uuid.UUID {
	var ids []uuid.UUID
	for _, product := range entry.Products {
		if slices.Contains(ownIDs, product.ID) {
			ids = append(ids, product.ID)
		}
	}
	return ids
}

func TestSuggestWithoutEmbeddingReturnsEmptyList(t *testing.T) {
	db := openTestDB(t)
	logs := captureLogs(t)
	service := newSuggestionService(db)
	noEmbedding := insertSlotProduct(t, db, testProduct{slot: models.SlotTop})
	insertSlotProduct(t, db, testProduct{slot: models.SlotTop, embedding: productEmbedding(0.1)})
	outfitID, ownerID := insertSuggestionOutfit(t, db, noEmbedding)

	got, err := service.Suggest(auth.WithUserID(context.Background(), ownerID), outfitID, []uuid.UUID{noEmbedding}, 12)
	if err != nil {
		t.Fatalf("Suggest: %v", err)
	}
	entry := got.Suggestions[noEmbedding]
	if entry.Products == nil || len(entry.Products) != 0 || entry.Error != "" {
		t.Fatalf("entry = %+v, want a non-nil empty list and no error", entry)
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

	got, err := service.Suggest(auth.WithUserID(context.Background(), ownerID), outfitID, []uuid.UUID{anchor}, 30)
	if err != nil {
		t.Fatalf("Suggest: %v", err)
	}
	ids := suggestedIDs(got.Suggestions[anchor], ownIDs)
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

	got, err := service.Suggest(auth.WithUserID(context.Background(), ownerID), outfitID, []uuid.UUID{anchor}, 1)
	if err != nil {
		t.Fatalf("Suggest: %v", err)
	}
	if len(got.Suggestions[anchor].Products) != 1 {
		t.Fatalf("got %d products, want 1", len(got.Suggestions[anchor].Products))
	}
}
