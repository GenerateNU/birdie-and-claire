package llm

import (
	"context"
	"errors"
	"strings"
)

const (
	dotpromptMarker = "<<<dotprompt:"
	// the answer is three short phrases and two short tag lists; this bounds what a padded answer can bill
	expandQueryMaxOutputTokens = 512
	// the default free model sometimes answers {}, and in replays it never did so twice for the same query
	expandQueryAttempts = 2
)

type expandQueryInput struct {
	Query string `json:"query"`
}

// ExpandQuery reads a short shopper query as one search phrase per slot plus tags to exclude and prefer.
func ExpandQuery(ctx context.Context, client Client, query string) (ExpandedQuery, error) {
	req := Request{
		promptName:      "expand_query",
		promptInput:     expandQueryInput{Query: stripDotpromptMarkers(query)},
		maxOutputTokens: expandQueryMaxOutputTokens,
		noReasoning:     true,
	}
	var err error
	for range expandQueryAttempts {
		var expanded ExpandedQuery
		expanded, err = Generate[ExpandedQuery](ctx, client, req)
		// the client already retries transport errors, 429 and 5xx, so only a bad answer is retried here
		if !errors.Is(err, ErrInvalidOutput) {
			return expanded, err
		}
	}
	return ExpandedQuery{}, err
}

// dotprompt splits the rendered prompt on its markers, so one inside the query would add messages or media
func stripDotpromptMarkers(query string) string {
	// one pass can reassemble a marker from pieces around another, such as "<<<dotprom<<<dotprompt:pt:"
	for strings.Contains(query, dotpromptMarker) {
		query = strings.ReplaceAll(query, dotpromptMarker, "")
	}
	return query
}
