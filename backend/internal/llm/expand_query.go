package llm

import (
	"context"
	"strings"
)

const dotpromptMarker = "<<<dotprompt:"

type expandQueryInput struct {
	Query string `json:"query"`
}

// ExpandQuery reads a short shopper query as one search phrase per slot plus tags to exclude and prefer.
func ExpandQuery(ctx context.Context, client Client, query string) (ExpandedQuery, error) {
	return Generate[ExpandedQuery](ctx, client, Request{
		promptName:  "expand_query",
		promptInput: expandQueryInput{Query: stripDotpromptMarkers(query)},
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
