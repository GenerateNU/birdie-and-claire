package llm

import (
	"context"
	"strings"
)

const (
	dotpromptMarker = "<<<dotprompt:"
	// the answer is three short phrases and two short tag lists; this bounds what a padded answer can bill
	expandQueryMaxOutputTokens = 512
)

type expandQueryInput struct {
	Query string `json:"query"`
}

// ExpandQuery reads a short shopper query as one search phrase per slot plus tags to exclude and prefer.
func ExpandQuery(ctx context.Context, client Client, query string) (ExpandedQuery, error) {
	return Generate[ExpandedQuery](ctx, client, Request{
		promptName:      "expand_query",
		promptInput:     expandQueryInput{Query: stripDotpromptMarkers(query)},
		maxOutputTokens: expandQueryMaxOutputTokens,
	})
}

// dotprompt splits the rendered prompt on its markers, so one inside the query would add messages or media
func stripDotpromptMarkers(query string) string {
	// one pass can reassemble a marker from pieces around another, such as "<<<dotprom<<<dotprompt:pt:"
	for strings.Contains(query, dotpromptMarker) {
		query = strings.ReplaceAll(query, dotpromptMarker, "")
	}
	return query
}
