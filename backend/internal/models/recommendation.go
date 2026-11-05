package models

import "github.com/danielgtaylor/huma/v2"

type RecommendationRequest struct {
	Occasion string                 `json:"occasion" required:"true" minLength:"1" maxLength:"100" doc:"A preset such as \"Workday\" or the shopper's own words"`
	Details  []RecommendationDetail `json:"details" required:"false" doc:"The shopper's other answers, each key at most once"`
}

type RecommendationDetail struct {
	Key RecommendationDetailKey `json:"key" enum:"weather,vibe,custom"`
	// 200 is the custom limit; weather and vibe values are checked against their lists
	Value string `json:"value" minLength:"1" maxLength:"200" doc:"For weather, one of RecommendationWeather; for vibe, one of RecommendationVibe; free text for custom. The server checks the value against its key"`
}

// TransformSchema points value at the RecommendationWeather and RecommendationVibe schemas from
// RegisterRecommendationEnums. The free-text branch keeps validation as it was: the controller
// checks a value against its key's list.
func (RecommendationDetail) TransformSchema(_ huma.Registry, s *huma.Schema) *huma.Schema {
	s.Properties["value"].AnyOf = []*huma.Schema{
		{Ref: "#/components/schemas/RecommendationWeather"},
		{Ref: "#/components/schemas/RecommendationVibe"},
		{Type: huma.TypeString},
	}

	return s
}

// RegisterRecommendationEnums adds the weather and vibe lists to the spec as named schemas, so the
// frontend can generate its buttons from them.
func RegisterRecommendationEnums(r huma.Registry) {
	schemas := r.Map()
	schemas["RecommendationWeather"] = &huma.Schema{Type: huma.TypeString, Enum: enumValues(RecommendationWeathers)}
	schemas["RecommendationVibe"] = &huma.Schema{Type: huma.TypeString, Enum: enumValues(RecommendationVibes)}
}

func enumValues(values []string) []any {
	enum := make([]any, len(values))
	for i, value := range values {
		enum[i] = value
	}
	return enum
}

// RecommendationDetailKey names one question in the occasion flow; a new question is a new key.
type RecommendationDetailKey string

const (
	DetailWeather RecommendationDetailKey = "weather"
	DetailVibe    RecommendationDetailKey = "vibe"
	DetailCustom  RecommendationDetailKey = "custom"
)

// RecommendationWeathers and RecommendationVibes are the values the occasion flow's buttons send.
// The spec publishes them as the RecommendationWeather and RecommendationVibe schemas, which the
// frontend client is generated from.
var (
	RecommendationWeathers = []string{"hot", "warm", "chilly", "cold", "rainy", "windy", "snowy", "storm"}
	RecommendationVibes    = []string{"professional", "chic", "casual", "sophisticated", "colorful"}
)

// OccasionPromptLabel and DetailPromptLabels name each answer in the prompt.
const OccasionPromptLabel = "occasion"

var DetailPromptLabels = map[RecommendationDetailKey]string{
	DetailWeather: "weather",
	DetailVibe:    "vibe",
	DetailCustom:  "custom",
}

type RecommendationResponse struct {
	ExpandedAnswers RecommendationExpandedAnswers `json:"expanded_answers"`
	Outfits         []RecommendedOutfit           `json:"outfits" nullable:"false" doc:"Up to 3 outfits, best first; fewer when a slot has fewer matching products"`
}

// RecommendedOutfit takes the same rank from each slot's search, so outfit n holds every slot's nth match.
type RecommendedOutfit struct {
	Top       ProductResponse `json:"top"`
	Bottom    ProductResponse `json:"bottom"`
	Accessory ProductResponse `json:"accessory"`
	Shoe      ProductResponse `json:"shoe"`
}

type RecommendationExpandedAnswers struct {
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
