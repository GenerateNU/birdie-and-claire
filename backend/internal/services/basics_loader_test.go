package services

import (
	"os"
	"strings"
	"testing"
)

func TestBasicsFileIsValid(t *testing.T) {
	data, err := os.ReadFile("../../data/basics.json")
	if err != nil {
		t.Fatalf("read basics file: %v", err)
	}
	if _, err := ParseBasics(data); err != nil {
		t.Fatalf("ParseBasics: %v", err)
	}
}

func TestParseBasicsRejectsValuesOffTheirLists(t *testing.T) {
	const validTags = `{"colors": ["black"], "formality": ["casual"], "occasions": ["everyday"], "season": ["summer"], "pattern": ["solid"], "fabric": ["denim"], "fit": ["regular"]}`
	entry := func(extra, tags string) string {
		return `[{"id": "22e8e7f2-752b-4744-98c1-4b314b660e79", "name": "Black Jeans", "product_type": "Jeans", "slot": "bottom",
			"source": "basic", "image_file": "black-jeans.png", "product_target": "women", ` + extra + `"tags": ` + tags + `}]`
	}

	tests := []struct {
		name string
		data string
		want string
	}{
		{name: "valid", data: entry(`"bottom_type": "pants", `, validTags)},
		{name: "unlisted color", data: entry("", strings.Replace(validTags, `"black"`, `"tan"`, 1)), want: `colors value "tan"`},
		{name: "type for another slot", data: entry(`"shoe_type": "boots", `, validTags), want: "shoe_type is set on a bottom"},
		{name: "unlisted type", data: entry(`"bottom_type": "culottes", `, validTags), want: `bottom_type "culottes"`},
		{name: "missing tag list", data: entry("", strings.Replace(validTags, `"fit": ["regular"]`, `"fit": null`, 1)), want: "fit is missing"},
		{name: "unknown field", data: entry(`"colour": "black", `, validTags), want: "unknown field"},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			_, err := ParseBasics([]byte(test.data))
			if test.want == "" {
				if err != nil {
					t.Fatalf("ParseBasics: %v", err)
				}
				return
			}
			if err == nil || !strings.Contains(err.Error(), test.want) {
				t.Fatalf("ParseBasics error = %v, want it to contain %q", err, test.want)
			}
		})
	}
}
