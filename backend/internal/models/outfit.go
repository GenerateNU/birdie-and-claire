package models

import (
	"time"

	"github.com/google/uuid"
)

// Outfit is a row from the outfits table.
type Outfit struct {
	ID        uuid.UUID
	UserID    uuid.UUID
	CreatedAt time.Time
}