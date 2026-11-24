package tests

import (
	"context"
	"database/sql"
	"math/rand/v2"
	"net/http"
	"testing"
	"time"

	"birdie-and-claire/internal/auth"
	"birdie-and-claire/internal/config"
	"birdie-and-claire/internal/controllers"
	"birdie-and-claire/internal/models"
	"birdie-and-claire/internal/repository"
	"birdie-and-claire/internal/server"
	"birdie-and-claire/internal/services"

	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/humatest"
	"github.com/google/uuid"
)

// total counts every one of the user's outfits on every page, and only that user's.
func TestListOutfitsTotalIgnoresCursor(t *testing.T) {
	db := openTestDB(t)
	service := services.NewOutfitService(repository.New(db), "")
	ownerID := insertTestUser(t, db)
	ctx := auth.WithUserID(context.Background(), ownerID)
	for range 3 {
		insertTestOutfitFor(t, db, ownerID)
	}
	// Another user's outfit, which a total of 3 proves is not counted.
	insertTestOutfit(t, db)

	first, err := service.List(ctx, nil, cursorParams(t, 2, ""))
	if err != nil {
		t.Fatalf("list first page: %v", err)
	}
	if len(first.Items) != 2 || !first.HasMore || first.Total != 3 {
		t.Fatalf("first page: %d items, has_more %t, total %d; want 2, true, 3", len(first.Items), first.HasMore, first.Total)
	}

	second, err := service.List(ctx, nil, cursorParams(t, 2, *first.NextCursor))
	if err != nil {
		t.Fatalf("list second page: %v", err)
	}
	if len(second.Items) != 1 || second.HasMore || second.Total != 3 {
		t.Fatalf("second page: %d items, has_more %t, total %d; want 1, false, 3", len(second.Items), second.HasMore, second.Total)
	}
}

func TestListOutfitsWithNoOutfitsHasZeroTotal(t *testing.T) {
	db := openTestDB(t)
	service := services.NewOutfitService(repository.New(db), "")
	ctx := auth.WithUserID(context.Background(), insertTestUser(t, db))

	page, err := service.List(ctx, nil, cursorParams(t, 20, ""))
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if page.Items == nil || len(page.Items) != 0 || page.HasMore || page.Total != 0 {
		t.Fatalf("got %v items, has_more %t, total %d; want [], false, 0", page.Items, page.HasMore, page.Total)
	}
}

const firstImageURL = "https://example.com/first.png"

// savedOutfits is what insertSavedOutfits stored, newest first.
type savedOutfits struct {
	ids []uuid.UUID
	// products holds each outfit's product IDs head to toe, and is empty for the outfit saved with none.
	products [][]uuid.UUID
	// imagedProduct is the one product saved with images, and firstImageURL is the one a list should show for it.
	imagedProduct uuid.UUID
}

// insertSavedOutfits saves count outfits of three products each, except the one at emptyIndex, which has none.
// The newest outfit's top gets two images, and the one at the lower position is firstImageURL.
func insertSavedOutfits(t *testing.T, db *sql.DB, ownerID uuid.UUID, count, emptyIndex int) savedOutfits {
	t.Helper()

	ctx := context.Background()
	outfits := repository.NewOutfitRepository(db)
	saved := savedOutfits{ids: make([]uuid.UUID, count), products: make([][]uuid.UUID, count)}
	newest := time.Now().Add(-time.Hour)
	for i := range count {
		var outfitID uuid.UUID
		if i == emptyIndex {
			err := db.QueryRowContext(ctx, `INSERT INTO outfits (user_id, name) VALUES ($1, 'empty') RETURNING id`, ownerID).Scan(&outfitID)
			if err != nil {
				t.Fatalf("insert empty outfit: %v", err)
			}
		} else {
			top := insertSlotProduct(t, db, testProduct{slot: models.SlotTop})
			bottom := insertSlotProduct(t, db, testProduct{slot: models.SlotBottom})
			shoe := insertSlotProduct(t, db, testProduct{slot: models.SlotShoe})
			created, _, err := outfits.Create(ctx, models.CreateOutfitParams{Name: "fit", ProductIDs: []uuid.UUID{shoe, top, bottom}}, ownerID)
			if err != nil {
				t.Fatalf("create outfit: %v", err)
			}
			outfitID = created.ID
			saved.products[i] = []uuid.UUID{top, bottom, shoe}
		}
		t.Cleanup(func() { _, _ = db.Exec(`DELETE FROM outfits WHERE id = $1`, outfitID) })
		// Fixed timestamps keep the listed order from depending on how close together the inserts were.
		if _, err := db.ExecContext(ctx, `UPDATE outfits SET created_at = $2 WHERE id = $1`, outfitID, newest.Add(-time.Duration(i)*time.Minute)); err != nil {
			t.Fatalf("set created_at: %v", err)
		}
		saved.ids[i] = outfitID
	}

	saved.imagedProduct = saved.products[0][0]
	for _, image := range []struct {
		url      string
		position int
	}{{"https://example.com/second.png", 2}, {firstImageURL, 1}} {
		_, err := db.ExecContext(ctx, `INSERT INTO product_images (shopify_id, product_id, url, position) VALUES ($1, $2, $3, $4)`,
			rand.Int64(), saved.imagedProduct, image.url, image.position)
		if err != nil {
			t.Fatalf("insert product image: %v", err)
		}
	}
	return saved
}

// wantWholeOutfit fails unless got is the index-th saved outfit with all of its products, head to toe, and with
// firstImageURL on the imaged product and no image on any other.
func wantWholeOutfit(t *testing.T, got models.OutfitResponse, saved savedOutfits, index int) {
	t.Helper()

	if got.ID != saved.ids[index] {
		t.Fatalf("outfit %d: id = %s, want %s", index, got.ID, saved.ids[index])
	}
	want := saved.products[index]
	if got.Products == nil {
		t.Fatalf("outfit %d: products is nil, want a list of %d", index, len(want))
	}
	if len(got.Products) != len(want) {
		t.Fatalf("outfit %d: %d products, want %d", index, len(got.Products), len(want))
	}
	for position, product := range got.Products {
		if product.ID != want[position] {
			t.Fatalf("outfit %d: product %d = %s, want %s", index, position, product.ID, want[position])
		}
		wantImage := "null"
		if product.ID == saved.imagedProduct {
			wantImage = firstImageURL
		}
		if gotImage := deref(product.ImageURL); gotImage != wantImage {
			t.Fatalf("outfit %d: product %d image_url = %s, want %s", index, position, gotImage, wantImage)
		}
	}
}

// deref prints a missing image URL as "null".
func deref(url *string) string {
	if url == nil {
		return "null"
	}
	return *url
}

// A page ends between outfits, never inside one: with three products per outfit, every outfit comes back whole and in
// order across the page edges, and an outfit with no products still appears, with an empty list.
func TestListOutfitsPagesKeepEveryOutfitWhole(t *testing.T) {
	const outfitCount, emptyIndex, pageSize = 6, 2, 2
	const pageCount = outfitCount / pageSize

	db := openTestDB(t)
	ownerID := insertTestUser(t, db)
	saved := insertSavedOutfits(t, db, ownerID, outfitCount, emptyIndex)
	service := services.NewOutfitService(repository.New(db), "")
	ctx := auth.WithUserID(context.Background(), ownerID)

	cursor := ""
	for page := range pageCount {
		got, err := service.List(ctx, nil, cursorParams(t, pageSize, cursor))
		if err != nil {
			t.Fatalf("list page %d: %v", page, err)
		}
		wantMore := page < pageCount-1
		if len(got.Items) != pageSize {
			t.Fatalf("page %d: %d outfits, want %d", page, len(got.Items), pageSize)
		}
		if got.Total != outfitCount {
			t.Fatalf("page %d: total = %d, want %d", page, got.Total, outfitCount)
		}
		if got.HasMore != wantMore || (got.NextCursor != nil) != wantMore {
			t.Fatalf("page %d: has_more = %t, next_cursor set = %t, want both %t", page, got.HasMore, got.NextCursor != nil, wantMore)
		}
		for i, item := range got.Items {
			wantWholeOutfit(t, item, saved, page*pageSize+i)
		}
		if wantMore {
			cursor = *got.NextCursor
		}
	}
}

// Filtered by a collection, the list keeps the newest-made order of the unfiltered one, and total counts only the
// collection's outfits.
func TestListOutfitsInACollectionCountsOnlyThose(t *testing.T) {
	db := openTestDB(t)
	service := services.NewOutfitService(repository.New(db), "")
	userID := insertTestUser(t, db)
	ctx := auth.WithUserID(context.Background(), userID)
	collection := createCollection(t, repository.NewCollectionRepository(db), userID, "fits")
	var madeOldestFirst []uuid.UUID
	for i := range 3 {
		outfitID := insertTestOutfitFor(t, db, userID)
		if _, err := db.Exec(`UPDATE outfits SET created_at = $2 WHERE id = $1`, outfitID, time.Now().Add(time.Duration(i-3)*time.Hour)); err != nil {
			t.Fatalf("set created_at: %v", err)
		}
		madeOldestFirst = append(madeOldestFirst, outfitID)
	}
	// The middle outfit stays out of the collection. The oldest is added last, so an order by when each was
	// added would come out reversed.
	oldest, newest := madeOldestFirst[0], madeOldestFirst[2]
	addToCollection(t, db, collection.ID, newest, time.Now().Add(-time.Minute))
	addToCollection(t, db, collection.ID, oldest, time.Now())
	inCollectionNewestFirst := []uuid.UUID{newest, oldest}

	page, err := service.List(ctx, &collection.ID, cursorParams(t, 20, ""))
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(page.Items) != 2 || page.Items[0].ID != inCollectionNewestFirst[0] || page.Items[1].ID != inCollectionNewestFirst[1] || page.Total != 2 {
		t.Fatalf("got %d items %v, total %d; want %v newest made first, total 2", len(page.Items), page.Items, page.Total, inCollectionNewestFirst)
	}
}

func TestListOutfitsInAnotherUsersOrMissingCollectionIsNotFound(t *testing.T) {
	db := openTestDB(t)
	service := services.NewOutfitService(repository.New(db), "")
	ownerID := insertTestUser(t, db)
	collection := createCollection(t, repository.NewCollectionRepository(db), ownerID, "mine")
	strangerCtx := auth.WithUserID(context.Background(), insertTestUser(t, db))

	for label, id := range map[string]uuid.UUID{"someone else's": collection.ID, "missing": uuid.New()} {
		t.Run(label, func(t *testing.T) {
			_, err := service.List(strangerCtx, &id, cursorParams(t, 20, ""))
			wantNotFound(t, err)
		})
	}
}

// A collection_id sent as the nil UUID names a collection that doesn't exist, so it is a 404 rather than every outfit.
func TestListOutfitsRouteTellsANilCollectionIDFromNone(t *testing.T) {
	db := openTestDB(t)
	userID := insertTestUser(t, db)
	insertTestOutfitFor(t, db, userID)
	controller := controllers.NewOutfitController(services.NewOutfitService(repository.New(db), ""))

	_, api := humatest.New(t, server.APIConfig(&config.Configuration{}))
	// The handler stands in for the auth middleware, which the test API does not run.
	huma.Register(api, huma.Operation{
		OperationID: "list-outfits", Method: http.MethodGet, Path: "/api/v1/outfits",
	}, func(ctx context.Context, input *controllers.ListOutfitsInput) (*controllers.ListOutfitsOutput, error) {
		return controller.List(auth.WithUserID(ctx, userID), input)
	})

	tests := []struct {
		name  string
		query string
		want  int
	}{
		{name: "no collection_id", query: "", want: http.StatusOK},
		{name: "the nil UUID", query: "?collection_id=" + uuid.Nil.String(), want: http.StatusNotFound},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			response := api.Get("/api/v1/outfits" + test.query)
			if response.Code != test.want {
				t.Fatalf("status = %d, want %d: %s", response.Code, test.want, response.Body)
			}
		})
	}
}
