package models

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
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
	Slot        ProductSlot   `json:"slot" enum:"top,bottom,accessory,shoe"`
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

// ProductAttributes are what the catalog sync's LLM read off a product's photo and store data. Every value outside
// Details and StyleNote comes from the fixed lists below, so a shopper's saved pick compares against it directly.
type ProductAttributes struct {
	ProductTarget string `json:"product_target"`
	// Each type is set only on a product in the slot it describes, and nil on every other product.
	NecklineType *string     `json:"neckline_type"`
	BottomType   *string     `json:"bottom_type"`
	ShoeType     *string     `json:"shoe_type"`
	Tags         ProductTags `json:"tags"`
	// short free-text phrases, such as "ribbed cuffs", that only go into the embedded text
	Details   []string `json:"details"`
	StyleNote string   `json:"style_note"`
}

// ProductTags groups a product's fixed-list labels. Recommendation tags match against every list at once.
type ProductTags struct {
	Colors    []string `json:"colors"`
	Formality []string `json:"formality"`
	Occasions []string `json:"occasions"`
	Season    []string `json:"season"`
	Pattern   []string `json:"pattern"`
	Fabric    []string `json:"fabric"`
	Fit       []string `json:"fit"`
}

// The lists come from docs/Style_Preferences_Design.md. The type lists repeat StylePreferences' enum values, which a
// saved pick is compared against.
var (
	ProductTargets   = []string{"women", "men", "girls", "boys", "unisex"}
	NecklineTypes    = []string{"high", "modest", "low"}
	BottomTypes      = []string{"pants", "skirt", "shorts", "dress"}
	ShoeTypes        = []string{"sneakers", "boots", "sandals", "heels", "flats"}
	ProductTagValues = ProductTags{
		Colors: []string{"black", "white", "grey", "charcoal", "navy", "blue", "green", "olive", "red", "pink", "purple",
			"orange", "yellow", "brown", "beige", "cream", "gold", "silver", "bronze", "multi"},
		Formality: []string{"casual", "smart_casual", "semi_formal", "formal"},
		Occasions: []string{"everyday", "work", "party", "date_night", "wedding_guest", "brunch", "beach", "travel",
			"workout", "lounge", "funeral"},
		Season:  []string{"spring", "summer", "fall", "winter"},
		Pattern: []string{"solid", "printed", "floral", "striped", "checked", "graphic", "embroidered"},
		Fabric:  []string{"cotton", "linen", "silk", "wool", "denim", "leather", "synthetic", "knit", "metal", "chiffon"},
		Fit:     []string{"slim", "regular", "relaxed", "oversized"},
	}
)

func (a ProductAttributes) Value() (driver.Value, error) {
	encoded, err := json.Marshal(a)
	if err != nil {
		return nil, fmt.Errorf("encode product attributes: %w", err)
	}
	return string(encoded), nil
}

// database/sql handles a NULL column itself and never calls Scan with nil.
func (a *ProductAttributes) Scan(src any) error {
	raw, ok := src.([]byte)
	if !ok {
		return fmt.Errorf("scan product attributes: unexpected type %T", src)
	}
	return json.Unmarshal(raw, a)
}
