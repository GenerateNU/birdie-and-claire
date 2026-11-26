package embedder

import (
	"context"
	"errors"
	"fmt"
	"math"
)

// EmbedProduct sums the text and image vectors and normalizes the result, which is how the seeded products' vectors
// were built. Everything that stores a product's embedding goes through it, so their vectors stay comparable.
func EmbedProduct(ctx context.Context, emb Embedder, text, imageURL string) ([]float32, error) {
	embedding, err := emb.EmbedText(ctx, text)
	if err != nil {
		return nil, err
	}
	imageEmbedding, err := emb.EmbedImage(ctx, imageURL)
	if err != nil {
		return nil, err
	}
	if len(imageEmbedding) != len(embedding) {
		return nil, fmt.Errorf("text vector has %d values and image vector has %d", len(embedding), len(imageEmbedding))
	}
	for i := range embedding {
		embedding[i] += imageEmbedding[i]
	}

	var squares float64
	for _, value := range embedding {
		squares += float64(value) * float64(value)
	}
	norm := float32(math.Sqrt(squares))
	if norm == 0 {
		return nil, errors.New("embedding is all zeros")
	}
	for i := range embedding {
		embedding[i] /= norm
	}
	return embedding, nil
}
