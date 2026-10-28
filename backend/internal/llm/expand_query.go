package llm

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
)

const (
	dotpromptMarker = "<<<dotprompt:"
	// the answer is four short phrases and two short tag lists; this bounds what a padded answer can bill
	expandAnswersMaxOutputTokens = 512
	// the default free model sometimes answers {}, and in replays it never did so twice for the same answers
	expandAnswersAttempts = 2
)

type expandAnswersInput struct {
	Answers string `json:"answers"`
}

// ExpandAnswers reads the shopper's answers, keyed by the label the prompt shows for each, as one
// search phrase per slot plus tags to exclude and prefer. Every slot of a nil-error result has a phrase.
func ExpandAnswers(ctx context.Context, client Client, answers map[string]string) (ExpandedQuery, error) {
	stripped := make(map[string]string, len(answers))
	for label, answer := range answers {
		stripped[label] = stripDotpromptMarkers(answer)
	}
	// json.Marshal escapes quotes and angle brackets, so shopper text cannot close the object or the block around it
	encoded, err := json.Marshal(stripped)
	if err != nil {
		return ExpandedQuery{}, fmt.Errorf("encode shopper answers: %w", err)
	}

	req := Request{
		promptName:      "expand_query",
		promptInput:     expandAnswersInput{Answers: string(encoded)},
		maxOutputTokens: expandAnswersMaxOutputTokens,
		noReasoning:     true,
	}
	for range expandAnswersAttempts {
		var expanded ExpandedQuery
		expanded, err = Generate[ExpandedQuery](ctx, client, req)
		if err == nil {
			err = requireEverySlot(expanded.Slots)
		}
		// the client already retries transport errors, 429 and 5xx, so only a bad answer is retried here
		if !errors.Is(err, ErrInvalidOutput) {
			return expanded, err
		}
	}
	return ExpandedQuery{}, err
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
