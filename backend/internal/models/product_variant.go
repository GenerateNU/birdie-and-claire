package models

import "github.com/google/uuid"

// ProductVariant is the part of a product_variants row that cart links need.
type ProductVariant struct {
	ShopifyID int64
	ProductID uuid.UUID
}
