package tests

import (
	"context"
	"database/sql"
	"testing"
	"time"

	"birdie-and-claire/internal/models"
	"birdie-and-claire/internal/repository"

	"github.com/google/uuid"
)

// A basic has no Shopify ID or handle, and loading it twice must leave one product, one image, and the first load's
// embedding hash in place.
func TestBasicLoadsIdempotentlyWithoutShopifyIdentity(t *testing.T) {
	db := openTestDB(t)
	ctx := context.Background()
	repo := repository.New(db)

	pants := "pants"
	basic := models.Basic{
		ID:          uuid.New(),
		Name:        "Test Jeans",
		ProductType: "Jeans",
		Slot:        models.SlotBottom,
		Source:      models.SourceBasic,
		ImageFile:   "test-jeans.png",
		ProductAttributes: models.ProductAttributes{
			ProductTarget: "women",
			BottomType:    &pants,
			Tags: models.ProductTags{
				Colors: []string{"blue"}, Formality: []string{"casual"}, Occasions: []string{"everyday"}, Season: []string{"summer"},
				Pattern: []string{"solid"}, Fabric: []string{"denim"}, Fit: []string{"regular"},
			},
		},
	}
	t.Cleanup(func() { _, _ = db.Exec(`DELETE FROM products WHERE id = $1`, basic.ID) })

	first, err := repo.Product.UpsertBasic(ctx, basic)
	if err != nil {
		t.Fatalf("first UpsertBasic: %v", err)
	}
	if first.EmbeddingHash != nil {
		t.Errorf("embedding hash after first load = %q, want nil", *first.EmbeddingHash)
	}
	if err := repo.Product.SaveEmbedding(ctx, basic.ID, productEmbedding(0), "hash"); err != nil {
		t.Fatalf("SaveEmbedding: %v", err)
	}
	updatedAt := productUpdatedAt(t, db, basic.ID)

	second, err := repo.Product.UpsertBasic(ctx, basic)
	if err != nil {
		t.Fatalf("second UpsertBasic: %v", err)
	}
	if second.EmbeddingHash == nil || *second.EmbeddingHash != "hash" {
		t.Errorf("embedding hash after rerun = %v, want %q", second.EmbeddingHash, "hash")
	}
	if rerunUpdatedAt := productUpdatedAt(t, db, basic.ID); !rerunUpdatedAt.Equal(updatedAt) {
		t.Errorf("updated_at after an unchanged rerun = %v, want %v", rerunUpdatedAt, updatedAt)
	}

	image := models.ProductImage{ID: uuid.New(), ProductID: basic.ID, URL: "https://example.com/test-jeans.png", AltText: &basic.Name}
	for range 2 {
		if err := repo.ProductImage.UpsertBasicImage(ctx, image); err != nil {
			t.Fatalf("UpsertBasicImage: %v", err)
		}
	}
	images, err := repo.ProductImage.FindByProductID(ctx, basic.ID)
	if err != nil {
		t.Fatalf("FindByProductID: %v", err)
	}
	if len(images) != 1 || images[0].ShopifyID != nil {
		t.Fatalf("images = %+v, want one image with no Shopify ID", images)
	}

	// large enough that other products in the slot cannot push the basic out
	scored, err := repo.Product.FindSimilar(ctx, queryEmbedding, models.SlotBottom, nil, []string{"denim"}, []string{"pants"}, nil, 1000)
	if err != nil {
		t.Fatalf("FindSimilar: %v", err)
	}
	requireBasicWithoutShopifyIdentity(t, scored, basic.ID, image.URL)
}

func productUpdatedAt(t *testing.T, db *sql.DB, id uuid.UUID) time.Time {
	t.Helper()

	var updatedAt time.Time
	if err := db.QueryRowContext(context.Background(), `SELECT updated_at FROM products WHERE id = $1`, id).Scan(&updatedAt); err != nil {
		t.Fatalf("read updated_at: %v", err)
	}
	return updatedAt
}

func requireBasicWithoutShopifyIdentity(t *testing.T, scored []repository.ScoredProduct, id uuid.UUID, wantImageURL string) {
	t.Helper()

	for _, candidate := range scored {
		if candidate.Product.ID != id {
			continue
		}
		if candidate.Product.ShopifyID != nil || candidate.Product.Handle != nil {
			t.Errorf("basic has Shopify ID %v and handle %v, want neither", candidate.Product.ShopifyID, candidate.Product.Handle)
		}
		if candidate.Product.Source != models.SourceBasic {
			t.Errorf("source = %q, want %q", candidate.Product.Source, models.SourceBasic)
		}
		if candidate.Product.ImageURL == nil || *candidate.Product.ImageURL != wantImageURL {
			t.Errorf("image URL = %v, want %q", candidate.Product.ImageURL, wantImageURL)
		}
		return
	}
	t.Fatalf("FindSimilar did not return the basic among %d products", len(scored))
}
