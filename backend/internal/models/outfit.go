package models

import (
	"time"

	"github.com/google/uuid"
)

type Outfit struct {
	ID        uuid.UUID  `json:"id"`
	UserID    uuid.UUID  `json:"user_id"`
	Name      string     `json:"name"`
	SharedAt  *time.Time `json:"shared_at" doc:"When the outfit was shared by link, or null while it is private"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
}

type OutfitResponse struct {
	Outfit
	Products []ProductResponse `json:"products" nullable:"false"`
}

// SharedOutfitResponse is what anyone with a share link sees: the owner's ID and
// name so the page can credit them, but no timestamps.
type SharedOutfitResponse struct {
	ID        uuid.UUID         `json:"id"`
	Name      string            `json:"name"`
	OwnerID   uuid.UUID         `json:"owner_id"`
	OwnerName string            `json:"owner_name"`
	Products  []ProductResponse `json:"products" nullable:"false"`
}

type ShareOutfitResponse struct {
	URL string `json:"url" doc:"Path of the outfit's public page, relative to the frontend origin; stays the same across re-shares"`
}

// OutfitSuggestionsResponse maps each requested product ID to the products that suit it, closest first.
type OutfitSuggestionsResponse struct {
	Suggestions map[uuid.UUID][]ProductResponse `json:"suggestions" nullable:"false"`
}

type CreateOutfitParams struct {
	Name       string
	ProductIDs []uuid.UUID
}

// UpdateOutfitParams leaves an empty field unchanged; ProductIDs, when set, replaces the whole product set.
type UpdateOutfitParams struct {
	Name       string
	ProductIDs []uuid.UUID
}
