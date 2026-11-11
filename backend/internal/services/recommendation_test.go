package services

import (
	"encoding/json"
	"os"
	"reflect"
	"slices"
	"strings"
	"testing"

	"birdie-and-claire/internal/models"
)

func TestFormatStylePreferences(t *testing.T) {
	tests := []struct {
		name        string
		preferences *models.StylePreferences
		want        string
	}{
		{name: "NULL or no users row", preferences: nil, want: ""},
		{name: "empty lists", preferences: &models.StylePreferences{Style: []string{}, Neckline: []string{}, Bottoms: []string{}, Shoes: []string{}}, want: ""},
		{name: "dress only", preferences: &models.StylePreferences{Bottoms: []string{"dress"}}, want: ""},
		{name: "bottoms and shoes", preferences: &models.StylePreferences{Bottoms: []string{"skirt"}, Shoes: []string{"flats"}}, want: "bottoms: skirt; shoes: flats"},
		{name: "saved out of order", preferences: &models.StylePreferences{Bottoms: []string{"shorts", "dress", "pants"}, Shoes: []string{"flats", "sneakers"}},
			want: "bottoms: pants, shorts; shoes: sneakers, flats"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := formatStylePreferences(tt.preferences); got != tt.want {
				t.Errorf("formatStylePreferences = %q, want %q", got, tt.want)
			}
		})
	}
}

// the fixture stores each pair's style preferences but not the text they become, so the text is written out here
func TestFormatStylePreferencesForEveryEvalPair(t *testing.T) {
	wantByPair := map[int]string{
		1:  "shoes: heels",
		2:  "shoes: sneakers",
		3:  "shoes: sandals",
		4:  "bottoms: skirt",
		5:  "bottoms: pants",
		6:  "bottoms: skirt",
		7:  "shoes: sandals",
		8:  "shoes: flats",
		9:  "shoes: heels, flats",
		10: "shoes: boots",
		11: "",
		12: "",
		13: "shoes: sneakers, boots, sandals, heels, flats",
		14: "bottoms: pants, skirt, shorts",
		15: "",
		16: "",
		17: "",
		18: "",
		19: "shoes: heels",
		20: "bottoms: skirt; shoes: flats",
	}

	raw, err := os.ReadFile("../tests/testdata/style_preferences_eval.json")
	if err != nil {
		t.Fatalf("read eval fixture: %v", err)
	}
	var fixture struct {
		Pairs []struct {
			Number           int                     `json:"number"`
			StylePreferences models.StylePreferences `json:"style_preferences"`
		} `json:"pairs"`
	}
	if err := json.Unmarshal(raw, &fixture); err != nil {
		t.Fatalf("decode eval fixture: %v", err)
	}
	if len(fixture.Pairs) != len(wantByPair) {
		t.Fatalf("fixture has %d pairs, want %d", len(fixture.Pairs), len(wantByPair))
	}

	for _, pair := range fixture.Pairs {
		want, ok := wantByPair[pair.Number]
		if !ok {
			t.Errorf("pair %d has no expected text", pair.Number)
			continue
		}
		if got := formatStylePreferences(&pair.StylePreferences); got != want {
			t.Errorf("pair %d: formatStylePreferences = %q, want %q", pair.Number, got, want)
		}
	}
}

// a value onboarding can save but the order lists miss would never reach the prompt
func TestOnboardingOrdersCoverEveryValue(t *testing.T) {
	preferencesType := reflect.TypeFor[models.StylePreferences]()
	for fieldName, order := range map[string][]string{"Bottoms": bottomsInOnboardingOrder, "Shoes": shoesInOnboardingOrder} {
		field, ok := preferencesType.FieldByName(fieldName)
		if !ok {
			t.Fatalf("StylePreferences has no %s field", fieldName)
		}
		for _, value := range strings.Split(field.Tag.Get("enum"), ",") {
			// left out on purpose, since outfits have no slot for a dress
			if value == "dress" {
				continue
			}
			if !slices.Contains(order, value) {
				t.Errorf("%s value %q is missing from its onboarding order list", fieldName, value)
			}
		}
	}
}
