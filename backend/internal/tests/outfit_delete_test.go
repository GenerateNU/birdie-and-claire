package tests

import (
	"context"
	"testing"

	"birdie-and-claire/internal/repository"

	"github.com/google/uuid"
)

func TestDeleteOutfitRemovesItsProductsAndReactionsThenRepeatIsNotFound(t *testing.T) {
	db := openTestDB(t)
	ctx := context.Background()
	repo := repository.NewOutfitRepository(db)
	outfitID, ownerID := insertTestOutfit(t, db)
	if _, err := db.ExecContext(ctx, `INSERT INTO outfit_reactions (user_id, outfit_id, kind) VALUES ($1, $2, 'like')`, ownerID, outfitID); err != nil {
		t.Fatalf("insert reaction: %v", err)
	}

	if err := repo.Delete(ctx, outfitID, ownerID); err != nil {
		t.Fatalf("delete: %v", err)
	}

	_, _, err := repo.GetByID(ctx, outfitID, ownerID)
	wantNotFound(t, err)
	for _, table := range []string{"outfit_products", "outfit_reactions"} {
		var leftover int
		if err := db.QueryRowContext(ctx, `SELECT count(*) FROM `+table+` WHERE outfit_id = $1`, outfitID).Scan(&leftover); err != nil {
			t.Fatalf("count %s rows: %v", table, err)
		}
		if leftover != 0 {
			t.Fatalf("%d %s rows left after delete, want 0", leftover, table)
		}
	}

	wantNotFound(t, repo.Delete(ctx, outfitID, ownerID))
}

// Someone else's outfit and a missing one both look like 404, and neither delete touches the outfit.
func TestDeleteNonOwnerAndMissingOutfitReturnNotFound(t *testing.T) {
	db := openTestDB(t)
	ctx := context.Background()
	repo := repository.NewOutfitRepository(db)
	outfitID, ownerID := insertTestOutfit(t, db)

	tests := []struct {
		name     string
		outfitID uuid.UUID
		userID   uuid.UUID
	}{
		{name: "not the owner", outfitID: outfitID, userID: insertTestUser(t, db)},
		{name: "nonexistent outfit", outfitID: uuid.New(), userID: ownerID},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			wantNotFound(t, repo.Delete(ctx, test.outfitID, test.userID))
		})
	}

	if _, products, err := repo.GetByID(ctx, outfitID, ownerID); err != nil || len(products) != 1 {
		t.Fatalf("owner GetByID after failed deletes: %d products, err %v; want 1 product", len(products), err)
	}
}
