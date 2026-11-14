package shopify

import "context"

type ShopifyProduct struct {
	ID          int64
	Handle      string
	Title       string
	ProductType string
	Description string
	// the taxonomy category's full name, or "" when the product has none
	Category string
	Tags     []string
	Options  []ShopifyOption
	// the store's fabric and fit notes, "" when the product has none
	FabricInfo string
	Materials  []string
	ModelInfo  string
	Images     []ShopifyImage
	// Shopify has no URL yet for an image it is still processing, so Images
	// leaves it out and is incomplete.
	HasProcessingImages bool
}

// ShopifyOption is one way a shopper picks a variant, such as Color with the values Navy and Ivory.
type ShopifyOption struct {
	Name   string
	Values []string
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
