package models

import (
	"time"

	"github.com/google/uuid"
)

type Outfit struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"user_id"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type OutfitResponse struct {
	Outfit
	Products []Product `json:"products" nullable:"false"`
}

type CreateOutfitParams struct {
	Name       string
	ProductIDs []uuid.UUID
}
