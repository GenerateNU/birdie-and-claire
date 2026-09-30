package embedder

import "context"

type Embedder interface {
	// The model reads at most 77 CLIP tokens and drops the rest, so only the
	// start of a long description shapes the vector.
	EmbedText(ctx context.Context, text string) ([]float32, error)
	EmbedImage(ctx context.Context, imageURL string) ([]float32, error)
	// Warm returns once a container is up with the model loaded, so the next
	// embed skips the cold start. Modal keeps it warm for about 60 seconds.
	Warm(ctx context.Context) error
}
