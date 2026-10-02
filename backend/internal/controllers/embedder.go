package controllers

import (
	"context"
	"time"

	"birdie-and-claire/internal/embedder"
	"birdie-and-claire/internal/log"

	"github.com/danielgtaylor/huma/v2"
)

type EmbedderController struct {
	embedder embedder.Embedder
}

func NewEmbedderController(emb embedder.Embedder) *EmbedderController {
	return &EmbedderController{embedder: emb}
}

type WarmOutput struct {
	Body struct {
		Warm      bool  `json:"warm" example:"true"`
		ElapsedMS int64 `json:"elapsed_ms" example:"41250"`
	}
}

// Warm logs the failure instead of returning it, because Modal's error body
// and the upstream URL are not for clients.
func (c *EmbedderController) Warm(ctx context.Context, _ *struct{}) (*WarmOutput, error) {
	start := time.Now()
	if err := c.embedder.Warm(ctx); err != nil {
		log.Error(ctx, "embedder warm failed", "error", err)
		return nil, huma.Error502BadGateway("embedder unavailable")
	}

	out := &WarmOutput{}
	out.Body.Warm = true
	out.Body.ElapsedMS = time.Since(start).Milliseconds()
	return out, nil
}
