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

// SharedOutfitResponse is what anyone with a share link sees, so it leaves out
// the owner and timestamps.
type SharedOutfitResponse struct {
	ID       uuid.UUID         `json:"id"`
	Name     string            `json:"name"`
	Products []ProductResponse `json:"products" nullable:"false"`
}

type ShareOutfitResponse struct {
	URL string `json:"url" doc:"Public link to the outfit; stays the same across re-shares"`
}

// OutfitSuggestionsResponse lists products that suit one item of an outfit, closest first.
type OutfitSuggestionsResponse struct {
	Products []ProductResponse `json:"products" nullable:"false"`
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
