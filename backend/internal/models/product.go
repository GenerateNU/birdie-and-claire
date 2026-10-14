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
)

// Product represents a row from the products table, without its embedding.
type Product struct {
	ID          uuid.UUID   `json:"id"`
	ShopifyID   int64       `json:"shopify_id"`
	Handle      string      `json:"handle"`
	Title       string      `json:"title"`
	ProductType *string     `json:"product_type"`
	Slot        ProductSlot `json:"slot" enum:"top,bottom,accessory,shoe"`
	Tags        []string    `json:"tags" nullable:"false"`
	CreatedAt   time.Time   `json:"created_at"`
	UpdatedAt   time.Time   `json:"updated_at"`
}
