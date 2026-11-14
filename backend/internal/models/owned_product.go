package models

import "time"

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
