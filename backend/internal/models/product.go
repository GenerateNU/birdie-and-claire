package models

import (
	"time"

	"github.com/google/uuid"
)

// ProductSlot is the part of an outfit a product fills, one of the product_slot enum's values.
type ProductSlot string

const (
	SlotTop       ProductSlot = "top"
	SlotBottom    ProductSlot = "bottom"
	SlotAccessory ProductSlot = "accessory"
	SlotShoe      ProductSlot = "shoe"
	// SlotOnePiece is a dress or jumpsuit, which takes the place of a top and a bottom.
	SlotOnePiece ProductSlot = "one_piece"
)

// ProductSource is where a product comes from, one of the product_source enum's values.
type ProductSource string

const (
	SourceBirdieAndClaire ProductSource = "birdie_and_claire"
	// SourceDemo is the seeded catalog, kept as filler until basics replace it.
	SourceDemo ProductSource = "demo"
)

// Product represents a row from the products table, without its embedding.
type Product struct {
	ID          uuid.UUID     `json:"id"`
	ShopifyID   int64         `json:"shopify_id"`
	Handle      string        `json:"handle"`
	Title       string        `json:"title"`
	ProductType *string       `json:"product_type"`
	Slot        ProductSlot   `json:"slot" enum:"top,bottom,accessory,shoe,one_piece"`
	Source      ProductSource `json:"source" enum:"birdie_and_claire,demo" doc:"birdie_and_claire for a product sold in the store, demo for seeded filler that is not for sale"`
	Tags        []string      `json:"tags" nullable:"false"`
	CreatedAt   time.Time     `json:"created_at"`
	UpdatedAt   time.Time     `json:"updated_at"`
}

// ProductResponse is a product with its first image, so a client can draw it without fetching its images.
type ProductResponse struct {
	Product
	ImageURL *string `json:"image_url" doc:"URL of the product's lowest-position image, or null when it has none"`
}
