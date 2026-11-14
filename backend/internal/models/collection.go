package models

import (
	"time"

	"github.com/google/uuid"
)

type Collection struct {
	ID          uuid.UUID `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description" doc:"Empty when the collection has no description"`
	CreatedAt   time.Time `json:"created_at"`
}

// CollectionSummaryResponse is a collection as the collections list shows it, without its outfits.
//
// Responses encode with encoding/json v1, which writes a nil slice as null, so a slice tagged nullable:"false" here
// has to be filled non-nil even when it is empty.
type CollectionSummaryResponse struct {
	Collection
	OutfitCount   int      `json:"outfit_count"`
	ThumbnailURLs []string `json:"thumbnail_urls" nullable:"false" doc:"One image for each of the up to 4 most recently added outfits, newest first"`
}

// CollectionOutfit is one outfit's link to a collection, which a page of the collection's outfits is cut from.
type CollectionOutfit struct {
	OutfitID uuid.UUID
	AddedAt  time.Time
}

type CreateCollectionParams struct {
	Name        string
	Description string
}

// UpdateCollectionParams leaves a field alone when it is its zero value, or nil for Description.
type UpdateCollectionParams struct {
	Name        string
	Description *string
}
