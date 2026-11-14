package models

import (
	"time"

	"github.com/google/uuid"
)

// ProductVariant represents a row from the product_variants table.
type ProductVariant struct {
	ID        uuid.UUID
	ShopifyID int64
	ProductID uuid.UUID
	Available bool
	Position  int
	CreatedAt time.Time
	UpdatedAt time.Time
}
