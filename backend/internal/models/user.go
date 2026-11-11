package models

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
)

type User struct {
	ID                uuid.UUID
	Name              string
	ProfilePictureKey *string
	StylePreferences  *StylePreferences
}

type UserResponse struct {
	ID                uuid.UUID `json:"id"`
	Name              string    `json:"name"`
	ProfilePictureURL *string   `json:"profile_picture_url"`
}

// CurrentUserResponse is the caller's own user, with the fields other users must not see.
type CurrentUserResponse struct {
	UserResponse
	StylePreferences *StylePreferences `json:"style_preferences,omitzero" doc:"Missing until the user finishes the onboarding preference steps"`
}

// StylePreferences are the user's onboarding answers. An empty list means no preference.
type StylePreferences struct {
	Style    []string `json:"style" enum:"chic_avant_garde,timeless_sophisticated,colorful_eclectic,comfortable_relaxed" uniqueItems:"true" nullable:"false"`
	Neckline []string `json:"neckline" enum:"modest,high,low" uniqueItems:"true" nullable:"false"`
	Bottoms  []string `json:"bottoms" enum:"pants,dress,skirt,shorts" uniqueItems:"true" nullable:"false"`
	Shoes    []string `json:"shoes" enum:"sneakers,boots,sandals,heels,flats" uniqueItems:"true" nullable:"false"`
}

func (p StylePreferences) Value() (driver.Value, error) {
	encoded, err := json.Marshal(p)
	if err != nil {
		return nil, fmt.Errorf("encode style preferences: %w", err)
	}
	return string(encoded), nil
}

// database/sql handles a NULL column itself and never calls Scan with nil.
func (p *StylePreferences) Scan(src any) error {
	raw, ok := src.([]byte)
	if !ok {
		return fmt.Errorf("scan style preferences: unexpected type %T", src)
	}
	return json.Unmarshal(raw, p)
}
