package llm

type ExpandedQuery struct {
	Slots ExpandedSlots `json:"slots"`
	// products carrying any of these are never shown
	ExcludeTags []string `json:"exclude_tags"`
	// each match is a small ranking bonus, never a filter
	NiceTags []string `json:"nice_tags"`
}

// one product search phrase per outfit slot; ExpandQuery rejects a blank one
type ExpandedSlots struct {
	Top       string `json:"top"`
	Bottom    string `json:"bottom"`
	Accessory string `json:"accessory"`
	Shoe      string `json:"shoe"`
}
