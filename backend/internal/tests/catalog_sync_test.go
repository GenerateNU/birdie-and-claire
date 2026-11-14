package tests

import (
	"context"
	"database/sql"
	"errors"
	"math/rand/v2"
	"slices"
	"testing"
	"time"

	"birdie-and-claire/internal/llm"
	"birdie-and-claire/internal/llm/llmtest"
	"birdie-and-claire/internal/models"
	"birdie-and-claire/internal/repository"
	"birdie-and-claire/internal/services"
	"birdie-and-claire/internal/shopify"

	"github.com/google/uuid"
)

const (
	// more than the dev database holds, so FindSimilar returns every match
	everyProduct    = 1000
	topsCategory    = "Apparel & Accessories > Clothing > Clothing Tops > Sweaters"
	dressesCategory = "Apparel & Accessories > Clothing > Dresses"
)

// a valid label with nothing on any list, so the embedded text is the title and store tags alone
const emptyLabels = `{"product_target":"women","neckline_type":"","bottom_type":"","shoe_type":"","tags":` + emptyTagLists +
	`,"details":[],"style_note":""}`

func emptyLabeler() *llmtest.Fake {
	return &llmtest.Fake{Text: emptyLabels}
}

// failingOnceLabeler fails its first call, then answers like its Fake.
type failingOnceLabeler struct {
	llmtest.Fake
	failed bool
}

func (l *failingOnceLabeler) Generate(ctx context.Context, req llm.Request) (llm.Response, error) {
	if !l.failed {
		l.failed = true
		return llm.Response{}, errors.New("gateway unavailable")
	}
	return l.Fake.Generate(ctx, req)
}

type fakeCatalog struct {
	products []shopify.ShopifyProduct
}

func (c *fakeCatalog) ListActiveProducts(context.Context) ([]shopify.ShopifyProduct, error) {
	return c.products, nil
}

// recordingEmbedder records its calls and returns full-size vectors, which the embedding column requires.
type recordingEmbedder struct {
	calls        int
	lastText     string
	lastImageURL string
}

func (e *recordingEmbedder) EmbedText(_ context.Context, text string) ([]float32, error) {
	e.calls++
	e.lastText = text
	return productEmbedding(0), nil
}

func (e *recordingEmbedder) EmbedImage(_ context.Context, imageURL string) ([]float32, error) {
	e.calls++
	e.lastImageURL = imageURL
	return productEmbedding(1), nil
}

func (e *recordingEmbedder) Warm(context.Context) error { return nil }

// failingOnceEmbedder fails its first text embed, then works like recordingEmbedder.
type failingOnceEmbedder struct {
	recordingEmbedder
	failed bool
}

func (e *failingOnceEmbedder) EmbedText(ctx context.Context, text string) ([]float32, error) {
	if !e.failed {
		e.failed = true
		return nil, errors.New("embedder unavailable")
	}
	return e.recordingEmbedder.EmbedText(ctx, text)
}

// openSyncTestDB opens the dev database for a sync test. A sync deactivates every product it did not see, so the
// products active before the test are set active again afterward, and the test's own products are deleted.
func openSyncTestDB(t *testing.T) *sql.DB {
	t.Helper()

	db := openTestDB(t)
	var activeIDs []uuid.UUID
	rows, err := db.Query(`SELECT id FROM products WHERE active ORDER BY id`)
	if err != nil {
		t.Fatalf("snapshot active products: %v", err)
	}
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			t.Fatalf("scan active product: %v", err)
		}
		activeIDs = append(activeIDs, id)
	}
	if err := rows.Err(); err != nil {
		t.Fatalf("iterate active products: %v", err)
	}
	_ = rows.Close()

	t.Cleanup(func() {
		if _, err := db.Exec(`UPDATE products SET active = true WHERE id = ANY($1)`, activeIDs); err != nil {
			t.Errorf("restore active products: %v", err)
		}
	})
	return db
}

func newSyncProduct(t *testing.T, db *sql.DB, category string, imageCount int) shopify.ShopifyProduct {
	t.Helper()

	product := shopify.ShopifyProduct{
		ID:       rand.Int64(),
		Handle:   "sync-test",
		Title:    "Sync test sweater",
		Category: category,
		Tags:     []string{"Knitwear"},
		Images:   []shopify.ShopifyImage{},
	}
	for position := 1; position <= imageCount; position++ {
		product.Images = append(product.Images, shopify.ShopifyImage{
			ID:       rand.Int64(),
			URL:      "https://cdn.shopify.com/sync-test.png?v=1",
			Position: position,
		})
	}
	// registered before any outfit cleanup, so it runs after the outfit is gone and nothing still references the row
	t.Cleanup(func() { _, _ = db.Exec(`DELETE FROM products WHERE shopify_id = $1`, product.ID) })
	return product
}

func runSync(t *testing.T, db *sql.DB, emb *recordingEmbedder, products ...shopify.ShopifyProduct) {
	t.Helper()
	runSyncWithLabeler(t, db, emb, emptyLabeler(), products...)
}

func runSyncWithLabeler(t *testing.T, db *sql.DB, emb *recordingEmbedder, labeler llm.Client, products ...shopify.ShopifyProduct) {
	t.Helper()

	catalog := &fakeCatalog{products: products}
	if err := services.NewCatalogSyncService(repository.New(db), catalog, emb, labeler).Sync(context.Background()); err != nil {
		t.Fatalf("Sync: %v", err)
	}
}

type syncedRow struct {
	id              uuid.UUID
	slot            models.ProductSlot
	productType     *string
	active          bool
	hasEmbedding    bool
	updatedAt       time.Time
	imageCount      int
	imagesUpdatedAt *time.Time
}

// findSyncedRow returns false when the product has no row.
func findSyncedRow(t *testing.T, db *sql.DB, shopifyID int64) (syncedRow, bool) {
	t.Helper()

	var row syncedRow
	err := db.QueryRow(`
		SELECT p.id, p.slot, p.product_type, p.active, p.embedding IS NOT NULL, p.updated_at,
			(SELECT count(*) FROM product_images pi WHERE pi.product_id = p.id),
			(SELECT max(pi.updated_at) FROM product_images pi WHERE pi.product_id = p.id)
		FROM products p
		WHERE p.shopify_id = $1
	`, shopifyID).Scan(&row.id, &row.slot, &row.productType, &row.active, &row.hasEmbedding, &row.updatedAt,
		&row.imageCount, &row.imagesUpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return syncedRow{}, false
	}
	if err != nil {
		t.Fatalf("find synced product %d: %v", shopifyID, err)
	}
	return row, true
}

func mustFindSyncedRow(t *testing.T, db *sql.DB, shopifyID int64) syncedRow {
	t.Helper()

	row, found := findSyncedRow(t, db, shopifyID)
	if !found {
		t.Fatalf("product %d was not synced", shopifyID)
	}
	return row
}

func TestCatalogSyncInsertsProductWithImagesAndEmbedding(t *testing.T) {
	db := openSyncTestDB(t)
	product := newSyncProduct(t, db, topsCategory, 2)

	runSync(t, db, &recordingEmbedder{}, product)

	row := mustFindSyncedRow(t, db, product.ID)
	if row.slot != models.SlotTop || !row.active || !row.hasEmbedding || row.imageCount != 2 {
		t.Fatalf("synced row = %+v, want an active, embedded top with 2 images", row)
	}
	if row.productType != nil {
		t.Fatalf("product_type = %q, want NULL for Shopify's empty product type", *row.productType)
	}

	var altTexts, widths int
	err := db.QueryRow(`SELECT count(alt_text), count(width) FROM product_images WHERE product_id = $1`, row.id).
		Scan(&altTexts, &widths)
	if err != nil {
		t.Fatalf("count image fields: %v", err)
	}
	if altTexts != 0 || widths != 0 {
		t.Fatalf("%d alt texts and %d widths set, want Shopify's empty values stored as NULL", altTexts, widths)
	}
}

func TestCatalogSyncRerunChangesNothing(t *testing.T) {
	db := openSyncTestDB(t)
	product := newSyncProduct(t, db, topsCategory, 2)
	emb := &recordingEmbedder{}

	runSync(t, db, emb, product)
	first := mustFindSyncedRow(t, db, product.ID)
	embedCalls := emb.calls

	runSync(t, db, emb, product)
	second := mustFindSyncedRow(t, db, product.ID)

	if !second.updatedAt.Equal(first.updatedAt) || !second.imagesUpdatedAt.Equal(*first.imagesUpdatedAt) {
		t.Fatalf("rerun touched the rows: product %v -> %v, images %v -> %v",
			first.updatedAt, second.updatedAt, *first.imagesUpdatedAt, *second.imagesUpdatedAt)
	}
	if emb.calls != embedCalls {
		t.Fatalf("rerun made %d embed calls, want 0", emb.calls-embedCalls)
	}
}

func TestCatalogSyncReembedsChangedProduct(t *testing.T) {
	db := openSyncTestDB(t)
	product := newSyncProduct(t, db, topsCategory, 1)
	emb := &recordingEmbedder{}

	runSync(t, db, emb, product)
	embedCalls := emb.calls

	product.Title = "Renamed sync test sweater"
	runSync(t, db, emb, product)

	if emb.calls == embedCalls {
		t.Fatal("a renamed product was not embedded again")
	}
}

func TestCatalogSyncDeletesRemovedImages(t *testing.T) {
	db := openSyncTestDB(t)
	product := newSyncProduct(t, db, topsCategory, 2)

	runSync(t, db, &recordingEmbedder{}, product)
	product.Images = product.Images[:1]
	runSync(t, db, &recordingEmbedder{}, product)

	if row := mustFindSyncedRow(t, db, product.ID); row.imageCount != 1 {
		t.Fatalf("product has %d images, want 1", row.imageCount)
	}
}

func TestCatalogSyncDropsMarketingTagsAndResizesImage(t *testing.T) {
	db := openSyncTestDB(t)
	product := newSyncProduct(t, db, topsCategory, 1)
	product.Tags = []string{"Knitwear", "Gifts50-100", "bestseller", "New", "MOD", "Quiz Results - Timeless Classic"}
	emb := &recordingEmbedder{}

	runSync(t, db, emb, product)

	var storedTags []string
	if err := db.QueryRow(`SELECT tags FROM products WHERE shopify_id = $1`, product.ID).Scan(&storedTags); err != nil {
		t.Fatalf("get stored tags: %v", err)
	}
	if !slices.Equal(storedTags, []string{"Knitwear"}) {
		t.Fatalf("stored tags = %v, want [Knitwear]", storedTags)
	}
	if want := "Sync test sweater, Knitwear"; emb.lastText != want {
		t.Fatalf("embedded text = %q, want %q", emb.lastText, want)
	}
	if want := "https://cdn.shopify.com/sync-test.png?v=1&width=1024"; emb.lastImageURL != want {
		t.Fatalf("embedded image url = %q, want %q", emb.lastImageURL, want)
	}
}

func TestCatalogSyncEmbedsOnlyProductsWithImages(t *testing.T) {
	db := openSyncTestDB(t)
	product := newSyncProduct(t, db, topsCategory, 0)
	emb := &recordingEmbedder{}

	runSync(t, db, emb, product)
	if row := mustFindSyncedRow(t, db, product.ID); row.hasEmbedding || emb.calls != 0 {
		t.Fatalf("a product with no image was embedded (%d embed calls)", emb.calls)
	}

	product.Images = []shopify.ShopifyImage{{ID: rand.Int64(), URL: "https://cdn.shopify.com/sync-test.png?v=1", Position: 1}}
	runSync(t, db, emb, product)
	if !mustFindSyncedRow(t, db, product.ID).hasEmbedding {
		t.Fatal("a product that gained an image was not embedded")
	}

	product.Images = []shopify.ShopifyImage{}
	runSync(t, db, emb, product)
	if mustFindSyncedRow(t, db, product.ID).hasEmbedding {
		t.Fatal("a product that lost its images kept its embedding")
	}
}

func TestCatalogSyncRetriesFailedEmbeddingNextRun(t *testing.T) {
	db := openSyncTestDB(t)
	ctx := context.Background()
	product := newSyncProduct(t, db, topsCategory, 1)
	catalog := &fakeCatalog{products: []shopify.ShopifyProduct{product}}
	catalogSync := services.NewCatalogSyncService(repository.New(db), catalog, &failingOnceEmbedder{}, emptyLabeler())

	if err := catalogSync.Sync(ctx); err == nil {
		t.Fatal("Sync with a failing embedder returned nil, want the embed error")
	}
	if row := mustFindSyncedRow(t, db, product.ID); !row.active || row.hasEmbedding {
		t.Fatalf("after a failed embed, row = %+v, want an active product with no embedding", row)
	}

	if err := catalogSync.Sync(ctx); err != nil {
		t.Fatalf("second Sync: %v", err)
	}
	if !mustFindSyncedRow(t, db, product.ID).hasEmbedding {
		t.Fatal("the next run did not retry the failed embed")
	}
}

func storedAttributes(t *testing.T, db *sql.DB, shopifyID int64) *models.ProductAttributes {
	t.Helper()

	var attributes *models.ProductAttributes
	if err := db.QueryRow(`SELECT attributes FROM products WHERE shopify_id = $1`, shopifyID).Scan(&attributes); err != nil {
		t.Fatalf("get attributes of product %d: %v", shopifyID, err)
	}
	return attributes
}

func TestCatalogSyncLabelsProductAndEmbedsItsLabels(t *testing.T) {
	db := openSyncTestDB(t)
	product := newSyncProduct(t, db, topsCategory, 1)
	product.Description = "A soft crew neck sweater."
	product.Options = []shopify.ShopifyOption{{Name: "Color", Values: []string{"Navy", "Ivory"}}}
	product.FabricInfo = "100% merino wool"
	labels := `{"product_target":"women","neckline_type":"modest","bottom_type":"skirt","shoe_type":"","tags":` +
		`{"colors":["navy","cream"],"formality":["casual"],"occasions":[],"season":["winter"],"pattern":["solid"],"fabric":["wool"],"fit":["regular"]},` +
		`"details":["ribbed cuffs"],"style_note":"A warm everyday layer."}`
	labeler := &llmtest.Fake{Text: labels}
	emb := &recordingEmbedder{}

	runSyncWithLabeler(t, db, emb, labeler, product)

	requests := labeler.Requests()
	if len(requests) != 1 {
		t.Fatalf("made %d label calls, want 1", len(requests))
	}
	attributes := storedAttributes(t, db, product.ID)
	if attributes == nil || attributes.NecklineType == nil || *attributes.NecklineType != "modest" || attributes.BottomType != nil {
		t.Fatalf("attributes = %+v, want a modest neckline and no bottom type on a top", attributes)
	}
	want := "Sync test sweater, modest neckline, solid, wool, regular, ribbed cuffs, navy, cream, Knitwear, casual, winter, A warm everyday layer."
	if emb.lastText != want {
		t.Fatalf("embedded text = %q, want %q", emb.lastText, want)
	}
}

func TestCatalogSyncRelabelsOnlyAChangedProduct(t *testing.T) {
	db := openSyncTestDB(t)
	product := newSyncProduct(t, db, topsCategory, 1)
	labeler := emptyLabeler()

	runSyncWithLabeler(t, db, &recordingEmbedder{}, labeler, product)
	runSyncWithLabeler(t, db, &recordingEmbedder{}, labeler, product)
	if calls := len(labeler.Requests()); calls != 1 {
		t.Fatalf("an unchanged product made %d label calls, want 1", calls)
	}

	product.Description = "Now with pockets."
	runSyncWithLabeler(t, db, &recordingEmbedder{}, labeler, product)
	if calls := len(labeler.Requests()); calls != 2 {
		t.Fatalf("a changed description made %d label calls in total, want 2", calls)
	}
}

func TestCatalogSyncRetriesFailedLabelNextRun(t *testing.T) {
	db := openSyncTestDB(t)
	ctx := context.Background()
	product := newSyncProduct(t, db, topsCategory, 1)
	catalog := &fakeCatalog{products: []shopify.ShopifyProduct{product}}
	emb := &recordingEmbedder{}
	catalogSync := services.NewCatalogSyncService(repository.New(db), catalog, emb, &failingOnceLabeler{Fake: llmtest.Fake{Text: emptyLabels}})

	if err := catalogSync.Sync(ctx); err == nil {
		t.Fatal("Sync with a failing labeler returned nil, want the label error")
	}
	if row := mustFindSyncedRow(t, db, product.ID); !row.active || row.hasEmbedding || emb.calls != 0 {
		t.Fatalf("after a failed label, row = %+v with %d embed calls, want an active product that was not embedded", row, emb.calls)
	}
	if attributes := storedAttributes(t, db, product.ID); attributes != nil {
		t.Fatalf("after a failed label, attributes = %+v, want none", attributes)
	}

	if err := catalogSync.Sync(ctx); err != nil {
		t.Fatalf("second Sync: %v", err)
	}
	if storedAttributes(t, db, product.ID) == nil || !mustFindSyncedRow(t, db, product.ID).hasEmbedding {
		t.Fatal("the next run did not retry the failed label and embed")
	}
}

func TestCatalogSyncKeepsOldLabelsWhenRelabelingFails(t *testing.T) {
	db := openSyncTestDB(t)
	product := newSyncProduct(t, db, topsCategory, 1)
	labels := `{"product_target":"women","neckline_type":"modest","bottom_type":"","shoe_type":"","tags":` + emptyTagLists +
		`,"details":[],"style_note":""}`
	runSyncWithLabeler(t, db, &recordingEmbedder{}, &llmtest.Fake{Text: labels}, product)

	product.Description = "Now with pockets."
	catalog := &fakeCatalog{products: []shopify.ShopifyProduct{product}}
	failing := &llmtest.Fake{Err: errors.New("gateway unavailable")}
	if err := services.NewCatalogSyncService(repository.New(db), catalog, &recordingEmbedder{}, failing).Sync(context.Background()); err == nil {
		t.Fatal("Sync with a failing labeler returned nil, want the label error")
	}

	attributes := storedAttributes(t, db, product.ID)
	if attributes == nil || attributes.NecklineType == nil || *attributes.NecklineType != "modest" {
		t.Fatalf("after a failed relabel, attributes = %+v, want the earlier modest neckline kept", attributes)
	}
	if !mustFindSyncedRow(t, db, product.ID).hasEmbedding {
		t.Fatal("a failed relabel cleared the product's embedding")
	}
}

func TestCatalogSyncKeepsImagesWhileShopifyProcessesOne(t *testing.T) {
	db := openSyncTestDB(t)
	product := newSyncProduct(t, db, topsCategory, 2)
	emb := &recordingEmbedder{}
	runSync(t, db, emb, product)
	embedCalls := emb.calls

	product.Images = product.Images[1:]
	product.HasProcessingImages = true
	// a new title changes the embedding's hash, so only the processing image holds the embed back
	product.Title = "Renamed sync test sweater"
	runSync(t, db, emb, product)

	row := mustFindSyncedRow(t, db, product.ID)
	if row.imageCount != 2 || !row.hasEmbedding {
		t.Fatalf("row = %+v, want both stored images and the embedding kept", row)
	}
	if emb.calls != embedCalls {
		t.Fatalf("made %d embed calls while an image was processing, want 0", emb.calls-embedCalls)
	}
}

func TestCatalogSyncMapsCategoryToSlot(t *testing.T) {
	cases := []struct {
		category string
		// "" when the product is skipped
		wantSlot models.ProductSlot
	}{
		{topsCategory, models.SlotTop},
		{"Apparel & Accessories > Clothing > Swimwear > Cover Ups", models.SlotTop},
		{"Apparel & Accessories > Clothing > Skirts", models.SlotBottom},
		{"Apparel & Accessories > Clothing Accessories > Hats > Beanies", models.SlotAccessory},
		{"Luggage & Bags > Tote Bags", models.SlotAccessory},
		{dressesCategory, ""},
		{"Apparel & Accessories > Clothing > One-Pieces", ""},
		{"Gift Cards", ""},
		{"", ""},
	}

	db := openSyncTestDB(t)
	products := make([]shopify.ShopifyProduct, len(cases))
	for i, tc := range cases {
		products[i] = newSyncProduct(t, db, tc.category, 0)
	}
	runSync(t, db, &recordingEmbedder{}, products...)

	for i, tc := range cases {
		row, found := findSyncedRow(t, db, products[i].ID)
		if tc.wantSlot == "" {
			if found {
				t.Errorf("category %q was synced as %s, want it skipped", tc.category, row.slot)
			}
			continue
		}
		if !found || row.slot != tc.wantSlot {
			t.Errorf("category %q: found = %v, slot = %q, want %s", tc.category, found, row.slot, tc.wantSlot)
		}
	}
}

func TestCatalogSyncDeactivatesMissingProductAndKeepsSavedOutfit(t *testing.T) {
	db := openSyncTestDB(t)
	ctx := context.Background()
	kept := newSyncProduct(t, db, topsCategory, 1)
	removed := newSyncProduct(t, db, topsCategory, 1)
	emb := &recordingEmbedder{}

	runSync(t, db, emb, kept, removed)
	removedID := mustFindSyncedRow(t, db, removed.ID).id

	outfits := repository.NewOutfitRepository(db)
	params := models.CreateOutfitParams{Name: "fit", ProductIDs: []uuid.UUID{removedID}}
	outfit, _, err := outfits.Create(ctx, params, insertTestUser(t, db))
	if err != nil {
		t.Fatalf("create outfit: %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM outfit_products WHERE outfit_id = $1`, outfit.ID)
		_, _ = db.Exec(`DELETE FROM outfits WHERE id = $1`, outfit.ID)
	})

	runSync(t, db, emb, kept)

	if mustFindSyncedRow(t, db, removed.ID).active {
		t.Fatal("a product missing from the store is still active")
	}
	if !mustFindSyncedRow(t, db, kept.ID).active {
		t.Fatal("a product still in the store was deactivated")
	}
	similar, err := repository.NewProductRepository(db).FindSimilar(ctx, productEmbedding(0), models.SlotTop, nil, nil, nil, nil, everyProduct)
	if err != nil {
		t.Fatalf("FindSimilar: %v", err)
	}
	for _, product := range similar {
		if product.ID == removedID {
			t.Fatal("FindSimilar returned an inactive product")
		}
	}
	_, saved, err := outfits.GetByID(ctx, outfit.ID, outfit.UserID)
	if err != nil {
		t.Fatalf("get outfit with an inactive product: %v", err)
	}
	if len(saved) != 1 || saved[0].ID != removedID {
		t.Fatalf("saved outfit products = %v, want the inactive product", saved)
	}

	runSync(t, db, emb, kept, removed)
	if !mustFindSyncedRow(t, db, removed.ID).active {
		t.Fatal("a product back in the store is still inactive")
	}
}

func TestCatalogSyncLeavesDemoProductsAlone(t *testing.T) {
	db := openSyncTestDB(t)
	var demoShopifyID int64
	err := db.QueryRow(`
		INSERT INTO products (shopify_id, handle, title, tags, slot)
		VALUES ($1, 'sync-test-demo', 'Sync test demo', '{}', 'shoe')
		RETURNING shopify_id
	`, rand.Int64()).Scan(&demoShopifyID)
	if err != nil {
		t.Fatalf("insert demo product: %v", err)
	}
	t.Cleanup(func() { _, _ = db.Exec(`DELETE FROM products WHERE shopify_id = $1`, demoShopifyID) })
	product := newSyncProduct(t, db, topsCategory, 0)

	runSync(t, db, &recordingEmbedder{}, product)

	if !mustFindSyncedRow(t, db, demoShopifyID).active {
		t.Fatal("the sync deactivated a demo product")
	}
	var sources []string
	err = db.QueryRow(`SELECT array_agg(source::text ORDER BY source) FROM products WHERE shopify_id IN ($1, $2)`,
		product.ID, demoShopifyID).Scan(&sources)
	if err != nil {
		t.Fatalf("get sources: %v", err)
	}
	if want := []string{string(models.SourceBirdieAndClaire), string(models.SourceDemo)}; !slices.Equal(sources, want) {
		t.Fatalf("sources = %v, want %v", sources, want)
	}
}

func TestCatalogSyncRefusesCatalogWithNothingToSync(t *testing.T) {
	cases := []struct {
		name     string
		products []shopify.ShopifyProduct
	}{
		{"no products", nil},
		{"no product matches a slot", []shopify.ShopifyProduct{{ID: rand.Int64(), Category: ""}}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			db := openSyncTestDB(t)
			product := newSyncProduct(t, db, topsCategory, 0)
			runSync(t, db, &recordingEmbedder{}, product)

			catalog := &fakeCatalog{products: tc.products}
			err := services.NewCatalogSyncService(repository.New(db), catalog, &recordingEmbedder{}, emptyLabeler()).Sync(context.Background())
			if err == nil {
				t.Fatal("Sync returned nil, want an error")
			}
			if !mustFindSyncedRow(t, db, product.ID).active {
				t.Fatal("a catalog with nothing to sync deactivated products")
			}
		})
	}
}
