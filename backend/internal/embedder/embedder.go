package embedder

import "context"

type Embedder interface {
	EmbedText(ctx context.Context, text string) ([]float32, error)
	EmbedImage(ctx context.Context, imageURL string) ([]float32, error)
	// warm endpoint
	Warm(ctx context.Context) error
}
