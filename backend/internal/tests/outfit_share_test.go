package tests

import (
	"context"
	"database/sql"
	"net/http"
	"testing"

	"birdie-and-claire/internal/errs"
	"birdie-and-claire/internal/models"
	"birdie-and-claire/internal/repository"

	"github.com/google/uuid"
)

// insertTestOutfit saves a private one-product outfit owned by a new user and returns both IDs.
func insertTestOutfit(t *testing.T, db *sql.DB) (outfitID uuid.UUID, ownerID uuid.UUID) {
	t.Helper()

	ownerID = insertTestUser(t, db)
	params := models.CreateOutfitParams{Name: "fit", ProductIDs: []uuid.UUID{insertTestProduct(t, db)}}
	outfit, _, err := repository.NewOutfitRepository(db).Create(context.Background(), params, ownerID)
	if err != nil {
		t.Fatalf("create outfit: %v", err)
	}
	t.Cleanup(func() { _, _ = db.Exec(`DELETE FROM outfits WHERE id = $1`, outfit.ID) })
	return outfit.ID, ownerID
}

func wantNotFound(t *testing.T, err error) {
	t.Helper()

	if got := statusOf(t, errs.ToHuma(context.Background(), err)); got != http.StatusNotFound {
		t.Fatalf("status = %d, want %d: %v", got, http.StatusNotFound, err)
	}
}

// Someone else's outfit and a missing one both look like 404, so IDs reveal nothing.
func TestOutfitOwnerChecks(t *testing.T) {
	db := openTestDB(t)
	ctx := context.Background()
	repo := repository.NewOutfitRepository(db)
	outfitID, ownerID := insertTestOutfit(t, db)
	strangerID := insertTestUser(t, db)

	if _, _, err := repo.GetByID(ctx, outfitID, ownerID); err != nil {
		t.Fatalf("owner GetByID: %v", err)
	}

	tests := []struct {
		name     string
		outfitID uuid.UUID
		userID   uuid.UUID
	}{
		{name: "not the owner", outfitID: outfitID, userID: strangerID},
		{name: "nonexistent outfit", outfitID: uuid.New(), userID: ownerID},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			_, _, err := repo.GetByID(ctx, test.outfitID, test.userID)
			wantNotFound(t, err)
			wantNotFound(t, repo.Share(ctx, test.outfitID, test.userID))
			wantNotFound(t, repo.Unshare(ctx, test.outfitID, test.userID))
		})
	}

	// A stranger's failed share must not have shared it.
	_, _, err := repo.GetShared(ctx, outfitID)
	wantNotFound(t, err)
}

func TestGetSharedOutfit(t *testing.T) {
	db := openTestDB(t)
	ctx := context.Background()
	repo := repository.NewOutfitRepository(db)
	outfitID, ownerID := insertTestOutfit(t, db)

	_, _, err := repo.GetShared(ctx, outfitID)
	wantNotFound(t, err)

	if err := repo.Share(ctx, outfitID, ownerID); err != nil {
		t.Fatalf("share: %v", err)
	}
	outfit, products, err := repo.GetShared(ctx, outfitID)
	if err != nil {
		t.Fatalf("get shared outfit: %v", err)
	}
	if outfit.ID != outfitID || len(products) != 1 {
		t.Fatalf("got outfit %s with %d products, want %s with 1", outfit.ID, len(products), outfitID)
	}

	if err := repo.Unshare(ctx, outfitID, ownerID); err != nil {
		t.Fatalf("unshare: %v", err)
	}
	_, _, err = repo.GetShared(ctx, outfitID)
	wantNotFound(t, err)

	_, _, err = repo.GetShared(ctx, uuid.New())
	wantNotFound(t, err)
}

func TestReshareKeepsSharedAt(t *testing.T) {
	db := openTestDB(t)
	ctx := context.Background()
	repo := repository.NewOutfitRepository(db)
	outfitID, ownerID := insertTestOutfit(t, db)

	if err := repo.Share(ctx, outfitID, ownerID); err != nil {
		t.Fatalf("first share: %v", err)
	}
	first, _, err := repo.GetByID(ctx, outfitID, ownerID)
	if err != nil {
		t.Fatalf("get after first share: %v", err)
	}
	if first.SharedAt == nil {
		t.Fatal("shared_at is null after share")
	}

	if err := repo.Share(ctx, outfitID, ownerID); err != nil {
		t.Fatalf("second share: %v", err)
	}
	second, _, err := repo.GetByID(ctx, outfitID, ownerID)
	if err != nil {
		t.Fatalf("get after second share: %v", err)
	}
	if second.SharedAt == nil || !second.SharedAt.Equal(*first.SharedAt) {
		t.Fatalf("shared_at = %v after re-share, want %v", second.SharedAt, first.SharedAt)
	}
}

// A retried unshare on an outfit that is already private still succeeds.
func TestUnsharePrivateOutfit(t *testing.T) {
	db := openTestDB(t)
	outfitID, ownerID := insertTestOutfit(t, db)

	if err := repository.NewOutfitRepository(db).Unshare(context.Background(), outfitID, ownerID); err != nil {
		t.Fatalf("unshare private outfit: %v", err)
	}
}
