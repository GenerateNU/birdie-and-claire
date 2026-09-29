package models

import (
	"time"

	"github.com/google/uuid"
)

// Outfit represents a row from the outfits table.
type Outfit struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"user_id"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type OutfitWithProducts struct {
	Outfit
	Products []Product `json:"products"`
}
