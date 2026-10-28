package tests

import (
	"context"
	"errors"
	"slices"
	"testing"

	"birdie-and-claire/internal/llm"
	"birdie-and-claire/internal/llm/llmtest"
)

func TestExpandAnswersDecodesTheAnswer(t *testing.T) {
	fake := &llmtest.Fake{Text: `{"slots":{"top":"light pastel blouse","bottom":"linen midi skirt","accessory":"straw hat","shoe":"tan sandals"},` +
		`"exclude_tags":["White"],"nice_tags":["Pastel","linen"]}`}

	got, err := llm.ExpandAnswers(context.Background(), fake, map[string]string{"occasion": "summer wedding guest"})
	if err != nil {
		t.Fatalf("ExpandAnswers: %v", err)
	}
	want := llm.ExpandedSlots{Top: "light pastel blouse", Bottom: "linen midi skirt", Accessory: "straw hat", Shoe: "tan sandals"}
	if got.Slots != want {
		t.Errorf("Slots = %+v, want %+v", got.Slots, want)
	}
	if !slices.Equal(got.ExcludeTags, []string{"White"}) || !slices.Equal(got.NiceTags, []string{"Pastel", "linen"}) {
		t.Errorf("tags = %q / %q, want them as the model wrote them", got.ExcludeTags, got.NiceTags)
	}
}

// the Fake does not validate the schema, so missing fields are covered against the stub gateway in internal/llm/genkit_test.go
func TestExpandAnswersRejectsUnknownFields(t *testing.T) {
	tests := []struct {
		name   string
		answer string
	}{
		{name: "unknown field", answer: `{"slots":{"top":"a","bottom":"b","accessory":"c","shoe":"d"},"exclude_tags":[],"nice_tags":[],"belt":"tan"}`},
		{name: "unknown slot", answer: `{"slots":{"top":"a","bottom":"b","accessory":"c","shoe":"d","belt":"tan"},"exclude_tags":[],"nice_tags":[]}`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := llm.ExpandAnswers(context.Background(), &llmtest.Fake{Text: tt.answer}, map[string]string{"occasion": "brunch"})
			if !errors.Is(err, llm.ErrInvalidOutput) {
				t.Fatalf("err = %v, want ErrInvalidOutput", err)
			}
		})
	}
}
