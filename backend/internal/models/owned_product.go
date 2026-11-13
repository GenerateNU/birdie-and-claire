package models

import "time"

// OwnedProductResponse is a product the user owns, with when they added it.
type OwnedProductResponse struct {
	ProductResponse
	AddedAt time.Time `json:"added_at" doc:"When the user added the product to the pieces they own"`
}
