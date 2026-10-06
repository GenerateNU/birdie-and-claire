package models

import (
	"time"

	"github.com/google/uuid"
)

// Product represents a row from the products table, without its embedding.
type Product struct {
	ID          uuid.UUID `json:"id"`
	ShopifyID   int64     `json:"shopify_id"`
	Handle      string    `json:"handle"`
	Title       string    `json:"title"`
	ProductType *string   `json:"product_type"`
	Tags        []string  `json:"tags" nullable:"false"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
