package tests

import (
	"context"
	"testing"

	"birdie-and-claire/internal/auth"
	"birdie-and-claire/internal/repository"
	"birdie-and-claire/internal/services"
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

	first, err := service.List(ctx, cursorParams(t, 2, ""))
	if err != nil {
		t.Fatalf("list first page: %v", err)
	}
	if len(first.Items) != 2 || !first.HasMore || first.Total != 3 {
		t.Fatalf("first page: %d items, has_more %t, total %d; want 2, true, 3", len(first.Items), first.HasMore, first.Total)
	}

	second, err := service.List(ctx, cursorParams(t, 2, *first.NextCursor))
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

	page, err := service.List(ctx, cursorParams(t, 20, ""))
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if page.Items == nil || len(page.Items) != 0 || page.HasMore || page.Total != 0 {
		t.Fatalf("got %v items, has_more %t, total %d; want [], false, 0", page.Items, page.HasMore, page.Total)
	}
}
