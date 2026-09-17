package tests

import (
	"testing"

	"example_project/internal/models"
)

func TestThreatScore(t *testing.T) {
	tests := []struct {
		name           string
		forceSensitive bool
		powerLevel     int
		want           int
	}{
		{name: "force sensitive", forceSensitive: true, powerLevel: 85, want: 170},
		{name: "not force sensitive", powerLevel: 60, want: 60},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			character := models.Character{ForceSensitive: test.forceSensitive, PowerLevel: test.powerLevel}
			if got := character.ThreatScore(); got != test.want {
				t.Fatalf("ThreatScore() = %d, want %d", got, test.want)
			}
		})
	}
}
