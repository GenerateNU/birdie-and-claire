package tests

import (
	"context"
	"database/sql"
	"math/rand/v2"
	"net/http"
	"net/http/httptest"
	"slices"
	"strings"
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

// insertOutfitWithImage saves an outfit of one product. imageURL "" leaves the product without an image.
func insertOutfitWithImage(t *testing.T, db *sql.DB, userID uuid.UUID, imageURL string) uuid.UUID {
	t.Helper()

	productID := insertTestProduct(t, db)
	if imageURL != "" {
		_, err := db.ExecContext(context.Background(),
			`INSERT INTO product_images (shopify_id, product_id, url) VALUES ($1, $2, $3)`, rand.Int64(), productID, imageURL)
		if err != nil {
			t.Fatalf("insert product image: %v", err)
		}
	}
	outfit, _, err := repository.NewOutfitRepository(db).Create(context.Background(),
		models.CreateOutfitParams{Name: "fit", ProductIDs: []uuid.UUID{productID}}, userID)
	if err != nil {
		t.Fatalf("create outfit: %v", err)
	}
	t.Cleanup(func() { _, _ = db.Exec(`DELETE FROM outfits WHERE id = $1`, outfit.ID) })
	return outfit.ID
}

// addToCollection writes the join row directly, since no route adds outfits to a collection yet.
func addToCollection(t *testing.T, db *sql.DB, collectionID, outfitID uuid.UUID, addedAt time.Time) {
	t.Helper()

	_, err := db.ExecContext(context.Background(),
		`INSERT INTO collection_outfits (collection_id, outfit_id, created_at) VALUES ($1, $2, $3)`, collectionID, outfitID, addedAt)
	if err != nil {
		t.Fatalf("add outfit to collection: %v", err)
	}
}

func createCollection(t *testing.T, repo repository.CollectionRepository, userID uuid.UUID, name string) models.CollectionResponse {
	t.Helper()

	collection, err := repo.Create(context.Background(), models.CreateCollectionParams{Name: name}, userID)
	if err != nil {
		t.Fatalf("create collection: %v", err)
	}
	return collection
}

func TestCreateCollectionStartsEmpty(t *testing.T) {
	db := openTestDB(t)
	userID := insertTestUser(t, db)

	got, err := repository.NewCollectionRepository(db).Create(context.Background(),
		models.CreateCollectionParams{Name: "Summer", Description: "Beach days"}, userID)
	if err != nil {
		t.Fatalf("Create: %v", err)
	}

	if got.Name != "Summer" || got.Description != "Beach days" || got.OutfitCount != 0 || got.ThumbnailURLs == nil || len(got.ThumbnailURLs) != 0 {
		t.Fatalf("got %+v, want Summer with no outfits and an empty, non-nil thumbnail list", got)
	}
}

func TestListCollectionsCountsOutfitsAndTakesThumbnailsFromTheFourNewest(t *testing.T) {
	db := openTestDB(t)
	repo := repository.NewCollectionRepository(db)
	userID := insertTestUser(t, db)
	older := createCollection(t, repo, userID, "older")
	newer := createCollection(t, repo, userID, "newer")
	empty := createCollection(t, repo, userID, "empty")
	for id, createdAt := range map[uuid.UUID]time.Time{
		older.ID: time.Now().Add(-3 * time.Hour), newer.ID: time.Now().Add(-2 * time.Hour), empty.ID: time.Now().Add(-1 * time.Hour),
	} {
		if _, err := db.Exec(`UPDATE collections SET created_at = $2 WHERE id = $1`, id, createdAt); err != nil {
			t.Fatalf("set created_at: %v", err)
		}
	}

	base := time.Now().Add(-time.Hour)
	var urls []string
	for i := range 5 {
		url := "https://example.com/" + string(rune('a'+i)) + ".png"
		urls = append(urls, url)
		addToCollection(t, db, newer.ID, insertOutfitWithImage(t, db, userID, url), base.Add(time.Duration(i)*time.Minute))
	}
	addToCollection(t, db, older.ID, insertOutfitWithImage(t, db, userID, "https://example.com/older.png"), base)

	strangerID := insertTestUser(t, db)
	createCollection(t, repo, strangerID, "stranger's")

	got, err := repo.List(context.Background(), userID)
	if err != nil {
		t.Fatalf("List: %v", err)
	}

	if len(got) != 3 || got[0].ID != empty.ID || got[1].ID != newer.ID || got[2].ID != older.ID {
		t.Fatalf("got %+v, want the user's three collections, newest first", got)
	}
	if got[0].OutfitCount != 0 || len(got[0].ThumbnailURLs) != 0 || got[0].ThumbnailURLs == nil {
		t.Errorf("empty collection = %+v, want count 0 and a non-nil empty thumbnail list", got[0])
	}
	wantThumbnails := []string{urls[4], urls[3], urls[2], urls[1]}
	if got[1].OutfitCount != 5 || !slices.Equal(got[1].ThumbnailURLs, wantThumbnails) {
		t.Errorf("newer collection = count %d, thumbnails %v, want count 5 and %v", got[1].OutfitCount, got[1].ThumbnailURLs, wantThumbnails)
	}
	if got[2].OutfitCount != 1 || !slices.Equal(got[2].ThumbnailURLs, []string{"https://example.com/older.png"}) {
		t.Errorf("older collection = %+v, want one outfit and its image", got[2])
	}
}

// The 4 newest outfits are picked before outfits with no image drop out, so one without an image leaves a gap
// rather than letting a fifth outfit take its place.
func TestListCollectionsOutfitWithoutImageLeavesAGap(t *testing.T) {
	db := openTestDB(t)
	repo := repository.NewCollectionRepository(db)
	userID := insertTestUser(t, db)
	collection := createCollection(t, repo, userID, "gappy")

	base := time.Now().Add(-time.Hour)
	imageURLs := []string{"https://example.com/oldest.png", "https://example.com/b.png", "", "https://example.com/d.png", "https://example.com/e.png"}
	for i, url := range imageURLs {
		addToCollection(t, db, collection.ID, insertOutfitWithImage(t, db, userID, url), base.Add(time.Duration(i)*time.Minute))
	}

	got, err := repo.List(context.Background(), userID)
	if err != nil {
		t.Fatalf("List: %v", err)
	}

	want := []string{"https://example.com/e.png", "https://example.com/d.png", "https://example.com/b.png"}
	if len(got) != 1 || got[0].OutfitCount != 5 || !slices.Equal(got[0].ThumbnailURLs, want) {
		t.Fatalf("got %+v, want count 5 and thumbnails %v", got, want)
	}
}

func TestGetCollectionReturnsOutfitsNewestAddedFirstWithProducts(t *testing.T) {
	db := openTestDB(t)
	repo := repository.NewCollectionRepository(db)
	userID := insertTestUser(t, db)
	collection := createCollection(t, repo, userID, "fits")
	first := insertOutfitWithImage(t, db, userID, "https://example.com/first.png")
	second := insertOutfitWithImage(t, db, userID, "https://example.com/second.png")
	now := time.Now()
	addToCollection(t, db, collection.ID, first, now.Add(-time.Hour))
	addToCollection(t, db, collection.ID, second, now)

	got, err := repo.GetByID(context.Background(), collection.ID, userID)
	if err != nil {
		t.Fatalf("GetByID: %v", err)
	}

	if got.Name != "fits" || len(got.Outfits) != 2 || got.Outfits[0].ID != second || got.Outfits[1].ID != first {
		t.Fatalf("got %+v, want both outfits, the one added last first", got)
	}
	for _, outfit := range got.Outfits {
		if len(outfit.Products) != 1 || outfit.Products[0].ImageURL == nil {
			t.Errorf("outfit %s products = %+v, want one product with its image", outfit.ID, outfit.Products)
		}
	}
}

func TestGetEmptyCollectionHasNoOutfits(t *testing.T) {
	db := openTestDB(t)
	repo := repository.NewCollectionRepository(db)
	userID := insertTestUser(t, db)
	collection := createCollection(t, repo, userID, "empty")

	got, err := repo.GetByID(context.Background(), collection.ID, userID)
	if err != nil {
		t.Fatalf("GetByID: %v", err)
	}

	if got.Outfits == nil || len(got.Outfits) != 0 {
		t.Fatalf("outfits = %#v, want a non-nil empty list", got.Outfits)
	}
}

// Someone else's collection and a missing one both look like 404, so IDs reveal nothing.
func TestCollectionOfAnotherUserOrMissingIsNotFound(t *testing.T) {
	db := openTestDB(t)
	ctx := context.Background()
	repo := repository.NewCollectionRepository(db)
	ownerID := insertTestUser(t, db)
	strangerID := insertTestUser(t, db)
	collection := createCollection(t, repo, ownerID, "mine")
	name := "stolen"

	for label, id := range map[string]uuid.UUID{"someone else's": collection.ID, "missing": uuid.New()} {
		t.Run(label, func(t *testing.T) {
			_, getErr := repo.GetByID(ctx, id, strangerID)
			_, updateErr := repo.Update(ctx, id, models.UpdateCollectionParams{Name: name}, strangerID)
			deleteErr := repo.Delete(ctx, id, strangerID)
			wantNotFound(t, getErr)
			wantNotFound(t, updateErr)
			wantNotFound(t, deleteErr)
		})
	}

	got, err := repo.GetByID(ctx, collection.ID, ownerID)
	if err != nil || got.Name != "mine" {
		t.Fatalf("owner's collection = %+v, %v, want it untouched", got, err)
	}
}

func TestUpdateCollectionChangesOnlyWhatIsSent(t *testing.T) {
	db := openTestDB(t)
	ctx := context.Background()
	repo := repository.NewCollectionRepository(db)
	userID := insertTestUser(t, db)
	created, err := repo.Create(ctx, models.CreateCollectionParams{Name: "old", Description: "keep me"}, userID)
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	addToCollection(t, db, created.ID, insertOutfitWithImage(t, db, userID, "https://example.com/a.png"), time.Now())

	renamed, err := repo.Update(ctx, created.ID, models.UpdateCollectionParams{Name: "new"}, userID)
	if err != nil {
		t.Fatalf("Update name: %v", err)
	}
	if renamed.Name != "new" || renamed.Description != "keep me" || renamed.OutfitCount != 1 || len(renamed.ThumbnailURLs) != 1 {
		t.Fatalf("after renaming got %+v, want the new name, the old description, and the outfit's count and thumbnail", renamed)
	}

	cleared := ""
	got, err := repo.Update(ctx, created.ID, models.UpdateCollectionParams{Description: &cleared}, userID)
	if err != nil {
		t.Fatalf("Update description: %v", err)
	}
	if got.Name != "new" || got.Description != "" {
		t.Fatalf("after clearing got %+v, want the name kept and an empty description", got)
	}
}

func TestDeleteCollectionKeepsItsOutfitsThenRepeatIsNotFound(t *testing.T) {
	db := openTestDB(t)
	ctx := context.Background()
	repo := repository.NewCollectionRepository(db)
	userID := insertTestUser(t, db)
	collection := createCollection(t, repo, userID, "doomed")
	outfitID := insertOutfitWithImage(t, db, userID, "https://example.com/a.png")
	addToCollection(t, db, collection.ID, outfitID, time.Now())

	if err := repo.Delete(ctx, collection.ID, userID); err != nil {
		t.Fatalf("Delete: %v", err)
	}

	if _, _, err := repository.NewOutfitRepository(db).GetByID(ctx, outfitID, userID); err != nil {
		t.Errorf("outfit after deleting its collection: %v, want it kept", err)
	}
	wantNotFound(t, repo.Delete(ctx, collection.ID, userID))
}

func TestDeletingAnOutfitRemovesItFromItsCollections(t *testing.T) {
	db := openTestDB(t)
	ctx := context.Background()
	repo := repository.NewCollectionRepository(db)
	userID := insertTestUser(t, db)
	collection := createCollection(t, repo, userID, "fits")
	outfitID := insertOutfitWithImage(t, db, userID, "https://example.com/a.png")
	addToCollection(t, db, collection.ID, outfitID, time.Now())

	if err := repository.NewOutfitRepository(db).Delete(ctx, outfitID, userID); err != nil {
		t.Fatalf("delete outfit: %v", err)
	}

	got, err := repo.List(ctx, userID)
	if err != nil || len(got) != 1 || got[0].OutfitCount != 0 || len(got[0].ThumbnailURLs) != 0 {
		t.Fatalf("List = %+v, %v, want the collection with no outfits", got, err)
	}
}

func TestCollectionRoutesValidateTheirBodies(t *testing.T) {
	db := openTestDB(t)
	userID := insertTestUser(t, db)
	collection := createCollection(t, repository.NewCollectionRepository(db), userID, "fits")
	controller := controllers.NewCollectionController(services.NewCollectionService(repository.New(db)))

	_, api := humatest.New(t, server.APIConfig(&config.Configuration{}))
	huma.Register(api, huma.Operation{
		OperationID: "create-collection", Method: http.MethodPost, Path: "/api/v1/collections", DefaultStatus: http.StatusCreated,
	}, func(ctx context.Context, input *controllers.CreateCollectionInput) (*controllers.CollectionOutput, error) {
		// Stands in for the auth middleware, which the test API does not run.
		return controller.Create(auth.WithUserID(ctx, userID), input)
	})
	huma.Register(api, huma.Operation{
		OperationID: "update-collection", Method: http.MethodPatch, Path: "/api/v1/collections/{id}",
	}, func(ctx context.Context, input *controllers.UpdateCollectionInput) (*controllers.CollectionOutput, error) {
		return controller.Update(auth.WithUserID(ctx, userID), input)
	})

	tests := []struct {
		name   string
		method string
		path   string
		body   map[string]any
		want   int
	}{
		{"create without a name", http.MethodPost, "/api/v1/collections", map[string]any{}, http.StatusUnprocessableEntity},
		{"create with a 101 character name", http.MethodPost, "/api/v1/collections", map[string]any{"name": strings.Repeat("a", 101)}, http.StatusUnprocessableEntity},
		{"create with a 251 character description", http.MethodPost, "/api/v1/collections", map[string]any{"name": "x", "description": strings.Repeat("a", 251)}, http.StatusUnprocessableEntity},
		{"create with a 250 character description", http.MethodPost, "/api/v1/collections", map[string]any{"name": "x", "description": strings.Repeat("a", 250)}, http.StatusCreated},
		{"update with an empty body", http.MethodPatch, "/api/v1/collections/" + collection.ID.String(), map[string]any{}, http.StatusUnprocessableEntity},
		{"update with a name", http.MethodPatch, "/api/v1/collections/" + collection.ID.String(), map[string]any{"name": "renamed"}, http.StatusOK},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			var response *httptest.ResponseRecorder
			if test.method == http.MethodPost {
				response = api.Post(test.path, test.body)
			} else {
				response = api.Patch(test.path, test.body)
			}
			if response.Code != test.want {
				t.Fatalf("status = %d, want %d: %s", response.Code, test.want, response.Body)
			}
		})
	}
}
