package models

type RecommendationRequest struct {
	Query string `json:"query" required:"true" minLength:"1" maxLength:"200" doc:"What the shopper is looking for, such as \"summer wedding guest\""`
}

// RecommendationResponse holds an empty list for a slot the query did not ask for.
type RecommendationResponse struct {
	ExpandedQuery RecommendationExpandedQuery `json:"expanded_query"`
	Top           []RecommendedProduct        `json:"top" nullable:"false"`
	Bottom        []RecommendedProduct        `json:"bottom" nullable:"false"`
	Accessory     []RecommendedProduct        `json:"accessory" nullable:"false"`
}

type RecommendationExpandedQuery struct {
	Slots       RecommendationExpandedSlots `json:"slots" doc:"The search phrase used for each slot; an empty phrase means the slot was not searched"`
	ExcludeTags []string                    `json:"exclude_tags" nullable:"false" doc:"Products carrying any of these tags were left out"`
	NiceTags    []string                    `json:"nice_tags" nullable:"false" doc:"Each matching tag moved a product up the ranking"`
}

type RecommendationExpandedSlots struct {
	Top       string `json:"top"`
	Bottom    string `json:"bottom"`
	Accessory string `json:"accessory"`
}

// RecommendedProduct carries the product's first image so a client can show results without
// fetching each product's images.
type RecommendedProduct struct {
	Product
	ImageURL *string `json:"image_url" doc:"URL of the product's lowest-position image, or null when it has none"`
}
