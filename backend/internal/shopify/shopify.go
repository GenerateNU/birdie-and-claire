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
	// ListActiveProducts returns every active product in the store.
	ListActiveProducts(ctx context.Context) ([]ShopifyProduct, error)
}
