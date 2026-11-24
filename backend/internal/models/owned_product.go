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

// ProductTypeFilter is the product type half of an Add Items tab's rule. The catalog and pieces lists both take it as
// query params, so a tab means the same on each. An empty ProductType or ExcludeProductType filters nothing.
type ProductTypeFilter struct {
	ProductType        string `query:"product_type" doc:"Only products of this product type"`
	ExcludeProductType string `query:"exclude_product_type" doc:"Leave out products of this product type. Products with no type stay in."`
}

// OwnedProductFilter picks the owned products a pieces list returns. Unlike a catalog list, no Slots means every slot.
type OwnedProductFilter struct {
	Slots []ProductSlot
	ProductTypeFilter
}

// BirdieAndClaireProductResponse is a store product in the Add Items catalog, with whether the user owns it.
type BirdieAndClaireProductResponse struct {
	ProductResponse
	Owned bool `json:"owned" doc:"Whether the authenticated user already owns the product"`
}

// BirdieAndClaireProductFilter picks the store products a catalog list returns.
type BirdieAndClaireProductFilter struct {
	Slots []ProductSlot
	ProductTypeFilter
	OwnedOnly bool
}

// BirdieAndClaireProductPage is one page of a catalog list, with how many products the whole list holds.
type BirdieAndClaireProductPage struct {
	pagination.Page[BirdieAndClaireProductResponse]
	Total int `json:"total" doc:"How many products match the filter, across every page"`
}
