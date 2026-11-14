package tests

import (
	"context"
	"database/sql"
	"math/rand/v2"
	"strconv"
	"testing"

	"birdie-and-claire/internal/auth"
	"birdie-and-claire/internal/models"
	"birdie-and-claire/internal/repository"
	"birdie-and-claire/internal/services"

	"github.com/google/uuid"
)

const cartTestShopURL = "https://shop.example"

type cartTestVariant struct {
	available bool
	position  int
}

// insertCartProduct inserts a product with the given source and active flag and returns its id with its variants'
// Shopify ids, in the order given.
func insertCartProduct(t *testing.T, db *sql.DB, source models.ProductSource, active bool, variants ...cartTestVariant) (uuid.UUID, []int64) {
	t.Helper()

	var productID uuid.UUID
	err := db.QueryRowContext(context.Background(), `
		INSERT INTO products (shopify_id, handle, title, slot, source, active)
		VALUES ($1, 'cart-test', 'Cart test', 'top', $2, $3)
		RETURNING id
	`, rand.Int64(), source, active).Scan(&productID)
	if err != nil {
		t.Fatalf("insert product: %v", err)
	}
	t.Cleanup(func() { _, _ = db.Exec(`DELETE FROM products WHERE id = $1`, productID) })

	shopifyIDs := make([]int64, 0, len(variants))
	for _, variant := range variants {
		shopifyID := rand.Int64()
		_, err := db.ExecContext(context.Background(), `
			INSERT INTO product_variants (shopify_id, product_id, available, position)
			VALUES ($1, $2, $3, $4)
		`, shopifyID, productID, variant.available, variant.position)
		if err != nil {
			t.Fatalf("insert variant: %v", err)
		}
		shopifyIDs = append(shopifyIDs, shopifyID)
	}
	return productID, shopifyIDs
}

func TestFirstAvailableVariantTakesLowestPositionAmongAvailable(t *testing.T) {
	db := openTestDB(t)
	productID, shopifyIDs := insertCartProduct(t, db, models.SourceBirdieAndClaire, true,
		cartTestVariant{available: true, position: 3},
		cartTestVariant{available: false, position: 1},
		cartTestVariant{available: true, position: 2},
	)
	soldOutID, _ := insertCartProduct(t, db, models.SourceBirdieAndClaire, true, cartTestVariant{available: false, position: 1})
	noVariantsID, _ := insertCartProduct(t, db, models.SourceBirdieAndClaire, true)

	got, err := repository.NewProductVariantRepository(db).FirstAvailableByProductIDs(context.Background(), []uuid.UUID{productID, soldOutID, noVariantsID})
	if err != nil {
		t.Fatalf("FirstAvailableByProductIDs: %v", err)
	}

	if len(got) != 1 || got[productID].ShopifyID != shopifyIDs[2] {
		t.Fatalf("got %+v, want only product %s with variant %d", got, productID, shopifyIDs[2])
	}
}

func TestOutfitGetBuildsCartLinksForBuyablePieces(t *testing.T) {
	db := openTestDB(t)
	service := services.NewOutfitService(repository.New(db), cartTestShopURL)

	buyableA, variantsA := insertCartProduct(t, db, models.SourceBirdieAndClaire, true, cartTestVariant{available: true, position: 1})
	buyableB, variantsB := insertCartProduct(t, db, models.SourceBirdieAndClaire, true,
		cartTestVariant{available: false, position: 1},
		cartTestVariant{available: true, position: 2},
	)
	owned, _ := insertCartProduct(t, db, models.SourceBirdieAndClaire, true, cartTestVariant{available: true, position: 1})
	demo, _ := insertCartProduct(t, db, models.SourceDemo, true, cartTestVariant{available: true, position: 1})
	inactive, _ := insertCartProduct(t, db, models.SourceBirdieAndClaire, false, cartTestVariant{available: true, position: 1})
	soldOut, _ := insertCartProduct(t, db, models.SourceBirdieAndClaire, true, cartTestVariant{available: false, position: 1})
	noVariants, _ := insertCartProduct(t, db, models.SourceBirdieAndClaire, true)

	outfitID, userID := insertSuggestionOutfit(t, db, buyableA, buyableB, owned, demo, inactive, soldOut, noVariants)
	if err := repository.NewOwnedProductRepository(db).AddOwnedProducts(context.Background(), userID, []uuid.UUID{owned}); err != nil {
		t.Fatalf("add owned product: %v", err)
	}

	got, err := service.Get(auth.WithUserID(context.Background(), userID), outfitID)
	if err != nil {
		t.Fatalf("Get: %v", err)
	}

	cartURLs := make(map[uuid.UUID]string, len(got.Products))
	for _, product := range got.Products {
		cartURLs[product.ID] = product.CartURL
	}
	wantA := cartURLs[buyableA]
	wantB := cartURLs[buyableB]
	if wantA != cartTestShopURL+"/cart/"+strconv.FormatInt(variantsA[0], 10)+":1" || wantB != cartTestShopURL+"/cart/"+strconv.FormatInt(variantsB[1], 10)+":1" {
		t.Fatalf("buyable cart urls = %q and %q", wantA, wantB)
	}
	for name, id := range map[string]uuid.UUID{"owned": owned, "demo": demo, "inactive": inactive, "sold out": soldOut, "no variants": noVariants} {
		if cartURLs[id] != "" {
			t.Errorf("%s piece has cart url %q, want none", name, cartURLs[id])
		}
	}
	if !productOwned(got, owned) || productOwned(got, buyableA) {
		t.Errorf("owned flags are wrong: owned piece %v, buyable piece %v", productOwned(got, owned), productOwned(got, buyableA))
	}
	// products come back head to toe with ties by id, so the add-all order follows the product list
	wantAll := cartTestShopURL + "/cart/"
	separator := ""
	for _, product := range got.Products {
		if product.CartURL != "" {
			wantAll += separator + product.CartURL[len(cartTestShopURL+"/cart/"):]
			separator = ","
		}
	}
	if got.AddAllToCartURL != wantAll {
		t.Fatalf("AddAllToCartURL = %q, want %q", got.AddAllToCartURL, wantAll)
	}
}

func TestOutfitGetLeavesOutAddAllWhenNothingIsBuyable(t *testing.T) {
	db := openTestDB(t)
	service := services.NewOutfitService(repository.New(db), cartTestShopURL)
	soldOut, _ := insertCartProduct(t, db, models.SourceBirdieAndClaire, true, cartTestVariant{available: false, position: 1})
	outfitID, userID := insertSuggestionOutfit(t, db, soldOut)

	got, err := service.Get(auth.WithUserID(context.Background(), userID), outfitID)
	if err != nil {
		t.Fatalf("Get: %v", err)
	}

	if got.AddAllToCartURL != "" {
		t.Fatalf("AddAllToCartURL = %q, want none", got.AddAllToCartURL)
	}
}

func productOwned(outfit models.OutfitDetailResponse, productID uuid.UUID) bool {
	for _, product := range outfit.Products {
		if product.ID == productID {
			return product.Owned
		}
	}
	return false
}
