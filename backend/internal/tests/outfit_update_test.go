package tests

import (
	"bytes"
	"context"
	"net/http"
	"slices"
	"strings"
	"testing"

	"birdie-and-claire/internal/controllers"
	"birdie-and-claire/internal/errs"
	"birdie-and-claire/internal/models"
	"birdie-and-claire/internal/repository"

	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/humatest"
	"github.com/google/uuid"
)

// updateOutfitProbe runs UpdateOutfitInput through the real Huma pipeline with no database behind it.
func updateOutfitProbe(t *testing.T) humatest.TestAPI {
	t.Helper()

	_, api := humatest.New(t)
	huma.Register(api, huma.Operation{
		OperationID: "update-outfit-probe",
		Method:      http.MethodPatch,
		Path:        "/probe/{id}",
	}, func(_ context.Context, _ *controllers.UpdateOutfitInput) (*struct{}, error) {
		return nil, nil
	})

	return api
}

func TestUpdateOutfitInputValidation(t *testing.T) {
	tests := []struct {
		name     string
		body     string
		want     int
		wantBody string
	}{
		{name: "empty body", body: `{}`, want: http.StatusUnprocessableEntity, wantBody: "body must set name or product_ids"},
		{name: "null name", body: `{"name": null}`, want: http.StatusUnprocessableEntity, wantBody: "name must not be null"},
		{name: "null product_ids", body: `{"product_ids": null}`, want: http.StatusUnprocessableEntity, wantBody: "product_ids must not be null"},
		{name: "both null", body: `{"name": null, "product_ids": null}`, want: http.StatusUnprocessableEntity, wantBody: "name must not be null"},
		// The other field is valid, so only UnmarshalJSON's null tracking can reject these.
		{name: "null name beside product_ids", body: `{"name": null, "product_ids": ["` + productIDLower + `"]}`, want: http.StatusUnprocessableEntity, wantBody: "name must not be null"},
		{name: "null product_ids beside name", body: `{"name": "fit", "product_ids": null}`, want: http.StatusUnprocessableEntity, wantBody: "product_ids must not be null"},
		// Keys match case-insensitively, so a differently cased null still counts.
		{name: "mixed-case null product_ids beside name", body: `{"name": "x", "Product_IDs": null}`, want: http.StatusUnprocessableEntity, wantBody: "product_ids must not be null"},
		{name: "mis-cased name alone", body: `{"Name": "x"}`, want: http.StatusNoContent},
		// Huma validates one copy of a field repeated in different casing, but Go keeps the last one.
		{name: "uppercase null name beside name", body: `{"NAME": null, "name": "x"}`, want: http.StatusUnprocessableEntity, wantBody: "name must not be repeated in different casing"},
		{name: "empty name after valid name", body: `{"name": "x", "NAME": ""}`, want: http.StatusUnprocessableEntity, wantBody: "name must not be repeated in different casing"},
		{name: "overlong name after valid name", body: `{"name": "x", "NAME": "` + strings.Repeat("n", 200) + `"}`, want: http.StatusUnprocessableEntity, wantBody: "name must not be repeated in different casing"},
		{name: "empty product_ids after valid product_ids", body: `{"product_ids": ["` + productIDLower + `"], "PRODUCT_IDS": []}`, want: http.StatusUnprocessableEntity, wantBody: "product_ids must not be repeated in different casing"},
		{name: "empty name", body: `{"name": ""}`, want: http.StatusUnprocessableEntity, wantBody: "body.name"},
		{name: "empty product_ids", body: `{"product_ids": []}`, want: http.StatusUnprocessableEntity, wantBody: "body.product_ids"},
		{name: "duplicate product ids", body: `{"product_ids": ["` + productIDUpper + `", "` + productIDLower + `"]}`, want: http.StatusBadRequest, wantBody: "duplicate product id"},
		{name: "product_ids absent", body: `{"name": "fit"}`, want: http.StatusNoContent},
		{name: "name absent", body: `{"product_ids": ["` + productIDLower + `"]}`, want: http.StatusNoContent},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			response := updateOutfitProbe(t).Patch("/probe/"+uuid.NewString(), strings.NewReader(test.body))
			if response.Code != test.want {
				t.Fatalf("status = %d, want %d: %s", response.Code, test.want, response.Body)
			}
			if !strings.Contains(response.Body.String(), test.wantBody) {
				t.Fatalf("body = %s, want it to contain %s", response.Body, test.wantBody)
			}
		})
	}
}

// sortedProductIDs orders IDs the way GetByID returns products, by p.id.
func sortedProductIDs(ids ...uuid.UUID) []uuid.UUID {
	return slices.SortedFunc(slices.Values(ids), func(a, b uuid.UUID) int { return bytes.Compare(a[:], b[:]) })
}

func productIDsOf(products []models.ProductResponse) []uuid.UUID {
	ids := make([]uuid.UUID, 0, len(products))
	for _, product := range products {
		ids = append(ids, product.ID)
	}
	return ids
}

func TestUpdateOutfitReplacesProductSet(t *testing.T) {
	db := openTestDB(t)
	ctx := context.Background()
	repo := repository.NewOutfitRepository(db)
	added := insertTestProduct(t, db)
	addedLater := insertTestProduct(t, db)
	outfitID, ownerID := insertTestOutfit(t, db)
	_, original, err := repo.GetByID(ctx, outfitID, ownerID)
	if err != nil {
		t.Fatalf("get outfit: %v", err)
	}
	kept := original[0].ID

	steps := []struct {
		name       string
		productIDs []uuid.UUID
	}{
		{name: "keep one and add one", productIDs: []uuid.UUID{kept, added}},
		{name: "drop the kept one and add another", productIDs: []uuid.UUID{addedLater, added}},
	}
	for _, step := range steps {
		_, products, err := repo.Update(ctx, outfitID, models.UpdateOutfitParams{ProductIDs: step.productIDs}, ownerID)
		if err != nil {
			t.Fatalf("%s: update: %v", step.name, err)
		}
		want := sortedProductIDs(step.productIDs...)
		if got := productIDsOf(products); !slices.Equal(got, want) {
			t.Fatalf("%s: returned products = %v, want %v", step.name, got, want)
		}
		_, stored, err := repo.GetByID(ctx, outfitID, ownerID)
		if err != nil {
			t.Fatalf("%s: get outfit: %v", step.name, err)
		}
		if got := productIDsOf(stored); !slices.Equal(got, want) {
			t.Fatalf("%s: stored products = %v, want %v", step.name, got, want)
		}
	}
}

func TestUpdateOutfitChangesOnlyTheFieldsSent(t *testing.T) {
	db := openTestDB(t)
	ctx := context.Background()
	repo := repository.NewOutfitRepository(db)
	replacement := insertTestProduct(t, db)
	outfitID, ownerID := insertTestOutfit(t, db)
	_, originalProducts, err := repo.GetByID(ctx, outfitID, ownerID)
	if err != nil {
		t.Fatalf("get outfit: %v", err)
	}

	newName := "renamed"
	renamed, products, err := repo.Update(ctx, outfitID, models.UpdateOutfitParams{Name: &newName}, ownerID)
	if err != nil {
		t.Fatalf("update name: %v", err)
	}
	if renamed.Name != newName {
		t.Fatalf("name = %q, want %q", renamed.Name, newName)
	}
	if got, want := productIDsOf(products), productIDsOf(originalProducts); !slices.Equal(got, want) {
		t.Fatalf("products after name-only update = %v, want %v", got, want)
	}

	withNewProducts, products, err := repo.Update(ctx, outfitID, models.UpdateOutfitParams{ProductIDs: []uuid.UUID{replacement}}, ownerID)
	if err != nil {
		t.Fatalf("update products: %v", err)
	}
	if withNewProducts.Name != newName {
		t.Fatalf("name after product_ids-only update = %q, want %q", withNewProducts.Name, newName)
	}
	if got, want := productIDsOf(products), []uuid.UUID{replacement}; !slices.Equal(got, want) {
		t.Fatalf("products = %v, want %v", got, want)
	}
}

func TestUpdateSomeoneElsesOutfitIsNotFound(t *testing.T) {
	db := openTestDB(t)
	ctx := context.Background()
	repo := repository.NewOutfitRepository(db)
	outfitID, ownerID := insertTestOutfit(t, db)
	strangerID := insertTestUser(t, db)

	newName := "stolen"
	_, _, err := repo.Update(ctx, outfitID, models.UpdateOutfitParams{Name: &newName}, strangerID)
	wantNotFound(t, err)

	outfit, _, err := repo.GetByID(ctx, outfitID, ownerID)
	if err != nil {
		t.Fatalf("get outfit: %v", err)
	}
	if outfit.Name == newName {
		t.Fatalf("a stranger's update renamed the outfit to %q", outfit.Name)
	}
}

// The unknown product fails after the name and updated_at were already written, so this checks the rollback.
func TestUpdateOutfitWithUnknownProductChangesNothing(t *testing.T) {
	db := openTestDB(t)
	ctx := context.Background()
	repo := repository.NewOutfitRepository(db)
	outfitID, ownerID := insertTestOutfit(t, db)
	before, beforeProducts, err := repo.GetByID(ctx, outfitID, ownerID)
	if err != nil {
		t.Fatalf("get outfit: %v", err)
	}

	newName := "renamed"
	params := models.UpdateOutfitParams{Name: &newName, ProductIDs: []uuid.UUID{uuid.New()}}
	_, _, err = repo.Update(ctx, outfitID, params, ownerID)
	if got := statusOf(t, errs.ToHuma(ctx, err)); got != http.StatusConflict {
		t.Fatalf("status = %d, want %d: %v", got, http.StatusConflict, err)
	}

	after, afterProducts, err := repo.GetByID(ctx, outfitID, ownerID)
	if err != nil {
		t.Fatalf("get outfit after failed update: %v", err)
	}
	if after.Name != before.Name || !after.UpdatedAt.Equal(before.UpdatedAt) {
		t.Fatalf("name, updated_at = %q, %v after failed update, want %q, %v", after.Name, after.UpdatedAt, before.Name, before.UpdatedAt)
	}
	if got, want := productIDsOf(afterProducts), productIDsOf(beforeProducts); !slices.Equal(got, want) {
		t.Fatalf("products = %v after failed update, want %v", got, want)
	}
}

func TestUpdateOutfitBumpsUpdatedAtAndKeepsSharedAt(t *testing.T) {
	db := openTestDB(t)
	ctx := context.Background()
	repo := repository.NewOutfitRepository(db)
	outfitID, ownerID := insertTestOutfit(t, db)
	if err := repo.Share(ctx, outfitID, ownerID); err != nil {
		t.Fatalf("share: %v", err)
	}
	before, _, err := repo.GetByID(ctx, outfitID, ownerID)
	if err != nil {
		t.Fatalf("get outfit: %v", err)
	}

	newName := "renamed"
	after, _, err := repo.Update(ctx, outfitID, models.UpdateOutfitParams{Name: &newName}, ownerID)
	if err != nil {
		t.Fatalf("update: %v", err)
	}
	if !after.UpdatedAt.After(before.UpdatedAt) {
		t.Fatalf("updated_at = %v, want after %v", after.UpdatedAt, before.UpdatedAt)
	}
	if after.SharedAt == nil || !after.SharedAt.Equal(*before.SharedAt) {
		t.Fatalf("shared_at = %v, want %v", after.SharedAt, before.SharedAt)
	}
}
