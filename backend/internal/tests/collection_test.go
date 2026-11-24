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

// addToCollection writes the join row directly, so a test can choose when the outfit was added.
func addToCollection(t *testing.T, db *sql.DB, collectionID, outfitID uuid.UUID, addedAt time.Time) {
	t.Helper()

	_, err := db.ExecContext(context.Background(),
		`INSERT INTO collection_outfits (collection_id, outfit_id, created_at) VALUES ($1, $2, $3)`, collectionID, outfitID, addedAt)
	if err != nil {
		t.Fatalf("add outfit to collection: %v", err)
	}
}

func createCollection(t *testing.T, repo repository.CollectionRepository, userID uuid.UUID, name string) models.CollectionSummaryResponse {
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

	got, err := repo.ListByUser(context.Background(), userID, nil, cursorParams(t, 20, ""))
	if err != nil {
		t.Fatalf("ListByUser: %v", err)
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

	got, err := repo.ListByUser(context.Background(), userID, nil, cursorParams(t, 20, ""))
	if err != nil {
		t.Fatalf("ListByUser: %v", err)
	}

	want := []string{"https://example.com/e.png", "https://example.com/d.png", "https://example.com/b.png"}
	if len(got) != 1 || got[0].OutfitCount != 5 || !slices.Equal(got[0].ThumbnailURLs, want) {
		t.Fatalf("got %+v, want count 5 and thumbnails %v", got, want)
	}
}

// The page stays newest added first across the cursor, and each outfit comes with its products.
func TestListCollectionOutfitsPagesNewestAddedFirstWithProducts(t *testing.T) {
	db := openTestDB(t)
	userID := insertTestUser(t, db)
	collection := createCollection(t, repository.NewCollectionRepository(db), userID, "fits")
	service := services.NewCollectionService(repository.New(db))
	ctx := auth.WithUserID(context.Background(), userID)
	base := time.Now().Add(-time.Hour)
	var newestFirst []uuid.UUID
	for i := range 3 {
		outfitID := insertOutfitWithImage(t, db, userID, "https://example.com/a.png")
		addToCollection(t, db, collection.ID, outfitID, base.Add(time.Duration(i)*time.Minute))
		newestFirst = slices.Insert(newestFirst, 0, outfitID)
	}

	first, err := service.ListCollectionOutfits(ctx, collection.ID, cursorParams(t, 2, ""))
	if err != nil {
		t.Fatalf("list first page: %v", err)
	}
	if len(first.Items) != 2 || first.Items[0].ID != newestFirst[0] || first.Items[1].ID != newestFirst[1] || !first.HasMore || first.NextCursor == nil {
		t.Fatalf("first page = %+v, want the two newest added and a cursor", first)
	}
	second, err := service.ListCollectionOutfits(ctx, collection.ID, cursorParams(t, 2, *first.NextCursor))
	if err != nil {
		t.Fatalf("list second page: %v", err)
	}
	if len(second.Items) != 1 || second.Items[0].ID != newestFirst[2] || second.HasMore || second.NextCursor != nil {
		t.Fatalf("second page = %+v, want only the oldest added and no cursor", second)
	}
	for _, outfit := range append(first.Items, second.Items...) {
		if len(outfit.Products) != 1 || outfit.Products[0].ImageURL == nil {
			t.Errorf("outfit %s products = %+v, want one product with its image", outfit.ID, outfit.Products)
		}
	}
}

func TestListCollectionsPagesNewestFirst(t *testing.T) {
	db := openTestDB(t)
	userID := insertTestUser(t, db)
	repo := repository.NewCollectionRepository(db)
	service := services.NewCollectionService(repository.New(db))
	ctx := auth.WithUserID(context.Background(), userID)
	var newestFirst []uuid.UUID
	for i := range 3 {
		collection := createCollection(t, repo, userID, "c")
		if _, err := db.Exec(`UPDATE collections SET created_at = $2 WHERE id = $1`, collection.ID, time.Now().Add(time.Duration(i-3)*time.Hour)); err != nil {
			t.Fatalf("set created_at: %v", err)
		}
		newestFirst = slices.Insert(newestFirst, 0, collection.ID)
	}

	first, err := service.ListUserCollections(ctx, nil, cursorParams(t, 2, ""))
	if err != nil {
		t.Fatalf("list first page: %v", err)
	}
	if len(first.Items) != 2 || first.Items[0].ID != newestFirst[0] || first.Items[1].ID != newestFirst[1] || !first.HasMore || first.NextCursor == nil {
		t.Fatalf("first page = %+v, want the two newest and a cursor", first)
	}
	second, err := service.ListUserCollections(ctx, nil, cursorParams(t, 2, *first.NextCursor))
	if err != nil {
		t.Fatalf("list second page: %v", err)
	}
	if len(second.Items) != 1 || second.Items[0].ID != newestFirst[2] || second.HasMore || second.NextCursor != nil {
		t.Fatalf("second page = %+v, want only the oldest and no cursor", second)
	}
}

func TestListEmptyCollectionOutfitsIsAnEmptyPage(t *testing.T) {
	db := openTestDB(t)
	userID := insertTestUser(t, db)
	collection := createCollection(t, repository.NewCollectionRepository(db), userID, "empty")
	service := services.NewCollectionService(repository.New(db))

	got, err := service.ListCollectionOutfits(auth.WithUserID(context.Background(), userID), collection.ID, cursorParams(t, 20, ""))
	if err != nil {
		t.Fatalf("ListCollectionOutfits: %v", err)
	}

	if got.Items == nil || len(got.Items) != 0 || got.HasMore {
		t.Fatalf("page = %#v, want a non-nil empty list and no more", got)
	}
}

// Someone else's collection and a missing one both look like 404, so IDs reveal nothing.
func TestCollectionOfAnotherUserOrMissingIsNotFound(t *testing.T) {
	db := openTestDB(t)
	ctx := context.Background()
	repo := repository.NewCollectionRepository(db)
	service := services.NewCollectionService(repository.New(db))
	ownerID := insertTestUser(t, db)
	strangerID := insertTestUser(t, db)
	collection := createCollection(t, repo, ownerID, "mine")
	name := "stolen"

	for label, id := range map[string]uuid.UUID{"someone else's": collection.ID, "missing": uuid.New()} {
		t.Run(label, func(t *testing.T) {
			_, getErr := repo.GetByID(ctx, id, strangerID)
			_, outfitsErr := service.ListCollectionOutfits(auth.WithUserID(ctx, strangerID), id, cursorParams(t, 20, ""))
			_, updateErr := repo.Update(ctx, id, models.UpdateCollectionParams{Name: name}, strangerID)
			deleteErr := repo.Delete(ctx, id, strangerID)
			wantNotFound(t, getErr)
			wantNotFound(t, outfitsErr)
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
	renamed, err := repo.Update(ctx, created.ID, models.UpdateCollectionParams{Name: "new"}, userID)
	if err != nil {
		t.Fatalf("Update name: %v", err)
	}
	if renamed.Name != "new" || renamed.Description != "keep me" {
		t.Fatalf("after renaming got %+v, want the new name and the old description", renamed)
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

	got, err := repo.ListByUser(ctx, userID, nil, cursorParams(t, 20, ""))
	if err != nil || len(got) != 1 || got[0].OutfitCount != 0 || len(got[0].ThumbnailURLs) != 0 {
		t.Fatalf("ListByUser = %+v, %v, want the collection with no outfits", got, err)
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
	}, func(ctx context.Context, input *controllers.CreateCollectionInput) (*controllers.CollectionSummaryOutput, error) {
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

// A repeated add keeps the outfit where it was in the collection, so a client can safely send it again.
func TestAddOutfitToCollectionThenRepeatKeepsItsPlace(t *testing.T) {
	db := openTestDB(t)
	userID := insertTestUser(t, db)
	collection := createCollection(t, repository.NewCollectionRepository(db), userID, "fits")
	service := services.NewCollectionService(repository.New(db))
	ctx := auth.WithUserID(context.Background(), userID)
	first := insertOutfitWithImage(t, db, userID, "https://example.com/first.png")
	second := insertOutfitWithImage(t, db, userID, "https://example.com/second.png")

	for _, outfitID := range []uuid.UUID{first, second, first} {
		if err := service.AddOutfit(ctx, collection.ID, outfitID); err != nil {
			t.Fatalf("AddOutfit %s: %v", outfitID, err)
		}
	}

	page, err := service.ListCollectionOutfits(ctx, collection.ID, cursorParams(t, 20, ""))
	if err != nil {
		t.Fatalf("ListCollectionOutfits: %v", err)
	}
	if len(page.Items) != 2 || page.Items[0].ID != second || page.Items[1].ID != first {
		t.Fatalf("outfits = %+v, want second then first, each once", page.Items)
	}
	collections, err := service.ListUserCollections(ctx, nil, cursorParams(t, 20, ""))
	if err != nil || len(collections.Items) != 1 || collections.Items[0].OutfitCount != 2 {
		t.Fatalf("collections = %+v, %v, want one collection counting 2 outfits", collections.Items, err)
	}
}

// Without both checks, someone could put another user's outfit in their own collection and read it from there.
func TestAddOutfitNeedsTheUsersCollectionAndOutfit(t *testing.T) {
	db := openTestDB(t)
	repo := repository.NewCollectionRepository(db)
	service := services.NewCollectionService(repository.New(db))
	userID := insertTestUser(t, db)
	strangerID := insertTestUser(t, db)
	mine := createCollection(t, repo, userID, "mine")
	theirs := createCollection(t, repo, strangerID, "theirs")
	myOutfit := insertTestOutfitFor(t, db, userID)
	theirOutfit := insertTestOutfitFor(t, db, strangerID)
	ctx := auth.WithUserID(context.Background(), userID)

	tests := []struct {
		name         string
		collectionID uuid.UUID
		outfitID     uuid.UUID
	}{
		{"someone else's outfit", mine.ID, theirOutfit},
		{"a missing outfit", mine.ID, uuid.New()},
		{"someone else's collection", theirs.ID, myOutfit},
		{"a missing collection", uuid.New(), myOutfit},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			wantNotFound(t, service.AddOutfit(ctx, test.collectionID, test.outfitID))
		})
	}

	var links int
	if err := db.QueryRow(`SELECT count(*) FROM collection_outfits WHERE collection_id = ANY($1)`, []uuid.UUID{mine.ID, theirs.ID}).Scan(&links); err != nil {
		t.Fatalf("count links: %v", err)
	}
	if links != 0 {
		t.Fatalf("links = %d, want none added", links)
	}
}

func TestRemoveOutfitFromCollectionKeepsTheOutfitThenRepeatSucceeds(t *testing.T) {
	db := openTestDB(t)
	repo := repository.NewCollectionRepository(db)
	service := services.NewCollectionService(repository.New(db))
	userID := insertTestUser(t, db)
	collection := createCollection(t, repo, userID, "fits")
	outfitID := insertOutfitWithImage(t, db, userID, "https://example.com/a.png")
	addToCollection(t, db, collection.ID, outfitID, time.Now())
	ctx := auth.WithUserID(context.Background(), userID)

	for range 2 {
		if err := service.RemoveOutfit(ctx, collection.ID, outfitID); err != nil {
			t.Fatalf("RemoveOutfit: %v", err)
		}
	}

	got, err := repo.ListByUser(ctx, userID, nil, cursorParams(t, 20, ""))
	if err != nil || len(got) != 1 || got[0].OutfitCount != 0 {
		t.Fatalf("ListByUser = %+v, %v, want the collection with no outfits", got, err)
	}
	if _, _, err := repository.NewOutfitRepository(db).GetByID(ctx, outfitID, userID); err != nil {
		t.Errorf("outfit after removing it from its collection: %v, want it kept", err)
	}
}

func TestRemoveOutfitFromAnotherUsersOrMissingCollectionIsNotFound(t *testing.T) {
	db := openTestDB(t)
	repo := repository.NewCollectionRepository(db)
	service := services.NewCollectionService(repository.New(db))
	ownerID := insertTestUser(t, db)
	strangerCtx := auth.WithUserID(context.Background(), insertTestUser(t, db))
	collection := createCollection(t, repo, ownerID, "mine")
	outfitID := insertOutfitWithImage(t, db, ownerID, "https://example.com/a.png")
	addToCollection(t, db, collection.ID, outfitID, time.Now())

	wantNotFound(t, service.RemoveOutfit(strangerCtx, collection.ID, outfitID))
	wantNotFound(t, service.RemoveOutfit(strangerCtx, uuid.New(), outfitID))

	got, err := repo.ListByUser(context.Background(), ownerID, nil, cursorParams(t, 20, ""))
	if err != nil || len(got) != 1 || got[0].OutfitCount != 1 {
		t.Fatalf("owner's collections = %+v, %v, want the outfit still in it", got, err)
	}
}

func TestListCollectionsSaysWhichHoldTheOutfitOnlyWhenAsked(t *testing.T) {
	db := openTestDB(t)
	repo := repository.NewCollectionRepository(db)
	service := services.NewCollectionService(repository.New(db))
	userID := insertTestUser(t, db)
	holding := createCollection(t, repo, userID, "holding")
	other := createCollection(t, repo, userID, "other")
	outfitID := insertOutfitWithImage(t, db, userID, "https://example.com/a.png")
	addToCollection(t, db, holding.ID, outfitID, time.Now())
	addToCollection(t, db, other.ID, insertOutfitWithImage(t, db, userID, "https://example.com/b.png"), time.Now())
	strangersOutfit, _ := insertTestOutfit(t, db)
	ctx := auth.WithUserID(context.Background(), userID)

	containsByID := func(outfitID *uuid.UUID) map[uuid.UUID]*bool {
		t.Helper()
		page, err := service.ListUserCollections(ctx, outfitID, cursorParams(t, 20, ""))
		if err != nil {
			t.Fatalf("ListUserCollections: %v", err)
		}
		contains := map[uuid.UUID]*bool{}
		for _, collection := range page.Items {
			contains[collection.ID] = collection.ContainsOutfit
		}
		return contains
	}

	asked := containsByID(&outfitID)
	if asked[holding.ID] == nil || !*asked[holding.ID] || asked[other.ID] == nil || *asked[other.ID] {
		t.Errorf("with the outfit: holding %v, other %v, want true and false", asked[holding.ID], asked[other.ID])
	}
	for id, contains := range containsByID(nil) {
		if contains != nil {
			t.Errorf("without an outfit: collection %s contains_outfit = %v, want it left out", id, *contains)
		}
	}
	for id, contains := range containsByID(&strangersOutfit) {
		if contains == nil || *contains {
			t.Errorf("with someone else's outfit: collection %s contains_outfit = %v, want false", id, contains)
		}
	}
}

func TestCollectionOutfitRoutes(t *testing.T) {
	db := openTestDB(t)
	userID := insertTestUser(t, db)
	collection := createCollection(t, repository.NewCollectionRepository(db), userID, "fits")
	outfitID := insertTestOutfitFor(t, db, userID)
	strangersOutfit, _ := insertTestOutfit(t, db)
	controller := controllers.NewCollectionController(services.NewCollectionService(repository.New(db)))

	_, api := humatest.New(t, server.APIConfig(&config.Configuration{}))
	// Each handler stands in for the auth middleware, which the test API does not run.
	huma.Register(api, huma.Operation{
		OperationID: "add-collection-outfit", Method: http.MethodPut, Path: "/api/v1/collections/{id}/outfits/{outfit_id}", DefaultStatus: http.StatusNoContent,
	}, func(ctx context.Context, input *controllers.CollectionOutfitInput) (*struct{}, error) {
		return controller.AddOutfit(auth.WithUserID(ctx, userID), input)
	})
	huma.Register(api, huma.Operation{
		OperationID: "remove-collection-outfit", Method: http.MethodDelete, Path: "/api/v1/collections/{id}/outfits/{outfit_id}", DefaultStatus: http.StatusNoContent,
	}, func(ctx context.Context, input *controllers.CollectionOutfitInput) (*struct{}, error) {
		return controller.RemoveOutfit(auth.WithUserID(ctx, userID), input)
	})
	huma.Register(api, huma.Operation{
		OperationID: "list-collections", Method: http.MethodGet, Path: "/api/v1/collections",
	}, func(ctx context.Context, input *controllers.ListUserCollectionsInput) (*controllers.ListUserCollectionsOutput, error) {
		return controller.ListUserCollections(auth.WithUserID(ctx, userID), input)
	})

	path := "/api/v1/collections/" + collection.ID.String() + "/outfits/"
	tests := []struct {
		name         string
		send         func() *httptest.ResponseRecorder
		want         int
		wantBodyHas  string
		wantBodyLack string
	}{
		{name: "add", send: func() *httptest.ResponseRecorder { return api.Put(path + outfitID.String()) }, want: http.StatusNoContent},
		{name: "add again", send: func() *httptest.ResponseRecorder { return api.Put(path + outfitID.String()) }, want: http.StatusNoContent},
		{name: "add someone else's outfit", send: func() *httptest.ResponseRecorder { return api.Put(path + strangersOutfit.String()) }, want: http.StatusNotFound},
		{
			name: "list asking about the outfit",
			send: func() *httptest.ResponseRecorder {
				return api.Get("/api/v1/collections?outfit_id=" + outfitID.String())
			},
			want:        http.StatusOK,
			wantBodyHas: `"contains_outfit":true`,
		},
		{
			name:         "list without asking",
			send:         func() *httptest.ResponseRecorder { return api.Get("/api/v1/collections") },
			want:         http.StatusOK,
			wantBodyLack: "contains_outfit",
		},
		{name: "list with a malformed outfit_id", send: func() *httptest.ResponseRecorder { return api.Get("/api/v1/collections?outfit_id=nope") }, want: http.StatusUnprocessableEntity},
		{
			name: "list asking about the nil UUID",
			send: func() *httptest.ResponseRecorder {
				return api.Get("/api/v1/collections?outfit_id=" + uuid.Nil.String())
			},
			want:        http.StatusOK,
			wantBodyHas: `"contains_outfit":false`,
		},
		{name: "remove", send: func() *httptest.ResponseRecorder { return api.Delete(path + outfitID.String()) }, want: http.StatusNoContent},
		{name: "remove again", send: func() *httptest.ResponseRecorder { return api.Delete(path + outfitID.String()) }, want: http.StatusNoContent},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			response := test.send()
			body := response.Body.String()
			if response.Code != test.want {
				t.Fatalf("status = %d, want %d: %s", response.Code, test.want, body)
			}
			if test.wantBodyHas != "" && !strings.Contains(body, test.wantBodyHas) {
				t.Errorf("body = %s, want it to contain %s", body, test.wantBodyHas)
			}
			if test.wantBodyLack != "" && strings.Contains(body, test.wantBodyLack) {
				t.Errorf("body = %s, want no %s", body, test.wantBodyLack)
			}
		})
	}
}
