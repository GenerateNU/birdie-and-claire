package controllers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"example_project/internal/auth"
	"example_project/internal/config"
	"example_project/internal/embedder"

	"github.com/danielgtaylor/huma/v2"
)

const supabaseTimeout = 5 * time.Second

type HealthController struct {
	supabase config.SupabaseConfig
	verifier *auth.Verifier
	embedder embedder.Embedder
}

func NewHealthController(supabase config.SupabaseConfig, verifier *auth.Verifier, emb embedder.Embedder) *HealthController {
	return &HealthController{supabase: supabase, verifier: verifier, embedder: emb}
}

type AuthOutput struct {
	Body struct {
		KeysLoaded bool `json:"keys_loaded" example:"true"`
	}
}

func (c *HealthController) Auth(ctx context.Context, _ *struct{}) (*AuthOutput, error) {
	out := &AuthOutput{}
	out.Body.KeysLoaded = c.verifier.KeysLoaded(ctx)
	return out, nil
}

type LivenessOutput struct {
	Body struct {
		Status string `json:"status" example:"ok"`
	}
}

func (c *HealthController) Liveness(_ context.Context, _ *struct{}) (*LivenessOutput, error) {
	out := &LivenessOutput{}
	out.Body.Status = "ok"
	return out, nil
}

type SupabaseOutput struct {
	Body any
}

func (c *HealthController) Supabase(ctx context.Context, _ *struct{}) (*SupabaseOutput, error) {
	url := c.supabase.JWKSURL()

	ctx, cancel := context.WithTimeout(ctx, supabaseTimeout)
	defer cancel()

	request, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, huma.Error500InternalServerError(err.Error())
	}

	response, err := http.DefaultClient.Do(request)
	if err != nil {
		return nil, huma.Error502BadGateway(err.Error())
	}
	defer func() { _ = response.Body.Close() }()

	if response.StatusCode != http.StatusOK {
		return nil, huma.Error502BadGateway(fmt.Sprintf("%s returned %d", url, response.StatusCode))
	}

	var body any
	if err := json.NewDecoder(response.Body).Decode(&body); err != nil {
		return nil, huma.Error502BadGateway(fmt.Sprintf("decode %s: %v", url, err))
	}
	return &SupabaseOutput{Body: body}, nil
}

type EmbedderOutput struct {
	Body struct {
		Warm      bool  `json:"warm" example:"true"`
		ElapsedMS int64 `json:"elapsed_ms" example:"41250"`
	}
}

func (c *HealthController) Embedder(ctx context.Context, _ *struct{}) (*EmbedderOutput, error) {
	start := time.Now()
	if err := c.embedder.Warm(ctx); err != nil {
		return nil, huma.Error502BadGateway(err.Error())
	}

	out := &EmbedderOutput{}
	out.Body.Warm = true
	out.Body.ElapsedMS = time.Since(start).Milliseconds()
	return out, nil
}
