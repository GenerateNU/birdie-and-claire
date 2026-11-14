package models

import (
	"time"

	"birdie-and-claire/internal/utils/pagination"
)

// OwnedProductResponse is a product the user owns, with when they added it.
type OwnedProductResponse struct {
	ProductResponse
	AddedAt time.Time `json:"added_at" doc:"When the user added the product to the pieces they own"`
}

// BirdieAndClaireProductResponse is a store product in the Add Items catalog, with whether the user owns it.
type BirdieAndClaireProductResponse struct {
	ProductResponse
	Owned bool `json:"owned" doc:"Whether the authenticated user already owns the product"`
}

// BirdieAndClaireProductFilter picks the store products a catalog list returns. An empty ProductType or
// ExcludeProductType filters nothing.
type BirdieAndClaireProductFilter struct {
	Slots              []ProductSlot
	ProductType        string
	ExcludeProductType string
	OwnedOnly          bool
}

// BirdieAndClaireProductPage is one page of a catalog list, with how many products the whole list holds.
type BirdieAndClaireProductPage struct {
	pagination.Page[BirdieAndClaireProductResponse]
	Total int `json:"total" doc:"How many products match the filter, across every page"`
}
