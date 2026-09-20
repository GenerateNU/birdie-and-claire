package controllers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"example_project/internal/config"

	"github.com/danielgtaylor/huma/v2"
)

const supabaseTimeout = 5 * time.Second

type HealthController struct {
	supabase config.SupabaseConfig
}

func NewHealthController(supabase config.SupabaseConfig) *HealthController {
	return &HealthController{supabase: supabase}
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
