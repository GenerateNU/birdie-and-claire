package models

// Character represents a row from the characters table.
type Character struct {
	ID             int    `json:"id"`
	Name           string `json:"name"`
	Species        string `json:"species"`
	Faction        string `json:"faction"`
	ForceSensitive bool   `json:"force_sensitive"`
	PowerLevel     int    `json:"power_level"`
}

type CharacterResponse struct {
	Character
	ThreatScore int `json:"threat_score"`
}

func (c Character) ThreatScore() int {
	if c.ForceSensitive {
		return c.PowerLevel * 2
	}
	return c.PowerLevel
}
