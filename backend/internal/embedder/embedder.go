package embedder

import "context"

type Embedder interface {
	// The model reads at most 77 CLIP tokens and drops the rest, so only the
	// start of a long description shapes the vector.
	EmbedText(ctx context.Context, text string) ([]float32, error)
	EmbedImage(ctx context.Context, imageURL string) ([]float32, error)
}
