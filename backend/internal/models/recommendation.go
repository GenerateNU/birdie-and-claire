package models

type RecommendationRequest struct {
	Occasion string                 `json:"occasion" required:"true" minLength:"1" maxLength:"100" doc:"A preset such as \"Workday\" or the shopper's own words"`
	Details  []RecommendationDetail `json:"details" required:"false" doc:"The shopper's other answers, each key at most once"`
}

type RecommendationDetail struct {
	Key RecommendationDetailKey `json:"key" enum:"weather,vibe,custom"`
	// 200 is the custom limit; weather and vibe values are checked against their lists
	Value string `json:"value" minLength:"1" maxLength:"200" doc:"One of the key's listed values, or free text for custom"`
}

// RecommendationDetailKey names one question in the occasion flow; a new question is a new key.
type RecommendationDetailKey string

const (
	DetailWeather RecommendationDetailKey = "weather"
	DetailVibe    RecommendationDetailKey = "vibe"
	DetailCustom  RecommendationDetailKey = "custom"
)

// RecommendationWeathers and RecommendationVibes are the values the occasion flow's buttons send.
var (
	RecommendationWeathers = []string{"hot", "warm", "chilly", "cold", "rainy", "windy", "snowy", "storm"}
	RecommendationVibes    = []string{"professional", "chic", "casual", "sophisticated", "colorful"}
)

// OccasionPromptLabel and DetailPromptLabels name each answer in the prompt.
const OccasionPromptLabel = "occasion"

var DetailPromptLabels = map[RecommendationDetailKey]string{
	DetailWeather: "weather",
	DetailVibe:    "vibe",
	DetailCustom:  "other details",
}

type RecommendationResponse struct {
	ExpandedQuery RecommendationExpandedQuery `json:"expanded_query"`
	Outfits       []RecommendedOutfit         `json:"outfits" nullable:"false" doc:"Up to 3 outfits, best first; fewer when a slot has fewer matching products"`
}

// RecommendedOutfit takes the same rank from each slot's search, so outfit n holds every slot's nth match.
type RecommendedOutfit struct {
	Top       RecommendedProduct `json:"top"`
	Bottom    RecommendedProduct `json:"bottom"`
	Accessory RecommendedProduct `json:"accessory"`
	Shoe      RecommendedProduct `json:"shoe"`
}

type RecommendationExpandedQuery struct {
	Slots       RecommendationExpandedSlots `json:"slots" doc:"The search phrase used for each slot"`
	ExcludeTags []string                    `json:"exclude_tags" nullable:"false" doc:"Products carrying any of these tags were left out"`
	NiceTags    []string                    `json:"nice_tags" nullable:"false" doc:"Each matching tag moved a product up the ranking"`
}

type RecommendationExpandedSlots struct {
	Top       string `json:"top"`
	Bottom    string `json:"bottom"`
	Accessory string `json:"accessory"`
	Shoe      string `json:"shoe"`
}

// RecommendedProduct carries the product's first image so a client can show results without
// fetching each product's images.
type RecommendedProduct struct {
	Product
	ImageURL *string `json:"image_url" doc:"URL of the product's lowest-position image, or null when it has none"`
}
