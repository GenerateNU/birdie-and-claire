package llm

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"birdie-and-claire/internal/models"
)

const (
	dotpromptMarker = "<<<dotprompt:"
	// the default free model sometimes answers {}, and in replays it never did so twice for the same answers
	expandAnswersAttempts = 2
	stylePreferencesLabel = "saved preferences"
)

type expandAnswersInput struct {
	Answers string `json:"answers"`
	// the template can't see inside the encoded answers, so this tells it whether to explain the saved preferences key
	HasStylePreferences bool               `json:"has_style_preferences"`
	TagVocabulary       models.ProductTags `json:"tag_vocabulary"`
}

// ExpandAnswers takes answers keyed by their prompt label, and stylePreferences as one line built from fixed option
// values, empty when the shopper has none. Every slot of a nil-error result has a phrase.
func ExpandAnswers(ctx context.Context, client Client, answers map[string]string, stylePreferences string) (ExpandedAnswers, error) {
	stripped := make(map[string]string, len(answers)+1)
	for label, answer := range answers {
		stripped[label] = stripDotpromptMarkers(answer)
	}
	// not stripped, since it holds only fixed option values and no shopper text
	if stylePreferences != "" {
		stripped[stylePreferencesLabel] = stylePreferences
	}
	// json.Marshal escapes quotes and angle brackets, so shopper text cannot close the object or the block around it
	encoded, err := json.Marshal(stripped)
	if err != nil {
		return ExpandedAnswers{}, fmt.Errorf("encode shopper answers: %w", err)
	}

	req := Request{
		promptName: "expand_answers",
		promptInput: expandAnswersInput{
			Answers:             string(encoded),
			HasStylePreferences: stylePreferences != "",
			TagVocabulary:       models.ProductTagValues,
		},
	}
	for range expandAnswersAttempts {
		var expandedAnswers ExpandedAnswers
		expandedAnswers, err = Generate[ExpandedAnswers](ctx, client, req)
		if err == nil {
			err = requireEverySlot(expandedAnswers.Slots)
		}
		// the client already retries transport errors, 429 and 5xx, so only a bad answer is retried here
		if !errors.Is(err, ErrInvalidOutput) {
			return expandedAnswers, err
		}
	}
	return ExpandedAnswers{}, err
}

// the embedder rejects blank text, and an outfit needs a product in every slot
func requireEverySlot(slots ExpandedSlots) error {
	for _, phrase := range []string{slots.Top, slots.Bottom, slots.Accessory, slots.Shoe} {
		if strings.TrimSpace(phrase) == "" {
			return fmt.Errorf("%w: a slot phrase is blank", ErrInvalidOutput)
		}
	}
	return nil
}

// dotprompt splits the rendered prompt on its markers, so one inside an answer would add messages or media
func stripDotpromptMarkers(answer string) string {
	// one pass can reassemble a marker from pieces around another, such as "<<<dotprom<<<dotprompt:pt:"
	for strings.Contains(answer, dotpromptMarker) {
		answer = strings.ReplaceAll(answer, dotpromptMarker, "")
	}
	return answer
}
