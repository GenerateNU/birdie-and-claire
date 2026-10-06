package models

import (
	"time"

	"github.com/google/uuid"
)

type ProductImage struct {
	ID        uuid.UUID
	ShopifyID int64
	ProductID uuid.UUID
	URL       string
	AltText   *string
	Width     *int
	Height    *int
	Position  int
	CreatedAt time.Time
	UpdatedAt time.Time
}

type ProductImageResponse struct {
	ID        uuid.UUID `json:"id"`
	URL       string    `json:"url"`
	AltText   *string   `json:"alt_text"`
	Width     *int      `json:"width"`
	Height    *int      `json:"height"`
	Position  int       `json:"position"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
