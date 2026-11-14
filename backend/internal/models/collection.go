package models

import "github.com/google/uuid"

type Collection struct {
	ID          uuid.UUID `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description" doc:"Empty when the collection has no description"`
}

type CollectionResponse struct {
	Collection
	OutfitCount   int      `json:"outfit_count"`
	ThumbnailURLs []string `json:"thumbnail_urls" nullable:"false" doc:"One image for each of the up to 4 most recently added outfits, newest first"`
}

type ListCollectionsResponse struct {
	Items []CollectionResponse `json:"items" nullable:"false"`
}

type CollectionDetailResponse struct {
	Collection
	Outfits []OutfitResponse `json:"outfits" nullable:"false" doc:"Newest added first"`
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
