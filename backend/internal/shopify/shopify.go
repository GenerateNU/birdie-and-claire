package shopify

import "context"

type ShopifyProduct struct {
	ID          int64
	Handle      string
	Title       string
	ProductType string
	// the taxonomy category's full name, or "" when the product has none
	Category string
	Tags     []string
	Images   []ShopifyImage
	// Shopify has no URL yet for an image it is still processing, so Images
	// leaves it out and is incomplete.
	HasProcessingImages bool
}

type ShopifyImage struct {
	ID       int64
	URL      string
	AltText  string
	Width    int
	Height   int
	Position int
}

type CatalogSource interface {
	ListActiveProducts(ctx context.Context) ([]ShopifyProduct, error)
}
