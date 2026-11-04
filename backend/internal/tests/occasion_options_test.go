package tests

import (
	"os"
	"regexp"
	"slices"
	"testing"

	"birdie-and-claire/internal/models"
)

// relative to this package, which is where go test runs
const occasionOptionsPath = "../../../frontend/src/occasionOptions.ts"

var (
	tsConstList = regexp.MustCompile(`export const (\w+) = \[([^\]]*)\] as const;`)
	tsString    = regexp.MustCompile(`"([^"]*)"`)
)

// TestOccasionOptionsMatchTheBackend fails when the buttons would send a value the backend rejects, or miss one it accepts.
func TestOccasionOptionsMatchTheBackend(t *testing.T) {
	source, err := os.ReadFile(occasionOptionsPath)
	if err != nil {
		t.Fatalf("read %s: %v", occasionOptionsPath, err)
	}

	frontendLists := map[string][]string{}
	for _, match := range tsConstList.FindAllStringSubmatch(string(source), -1) {
		var values []string
		for _, value := range tsString.FindAllStringSubmatch(match[2], -1) {
			values = append(values, value[1])
		}
		frontendLists[match[1]] = values
	}

	backendLists := map[string][]string{
		"weathers": models.RecommendationWeathers,
		"vibes":    models.RecommendationVibes,
	}
	for name, backend := range backendLists {
		frontend, ok := frontendLists[name]
		if !ok {
			t.Errorf("%s has no plain `export const %s = [...] as const;` list", occasionOptionsPath, name)
			continue
		}
		if !slices.Equal(frontend, backend) {
			t.Errorf("%s in %s = %q, want the backend's %q", name, occasionOptionsPath, frontend, backend)
		}
	}
}
