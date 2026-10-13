package controllers

import (
	"context"
	"strings"

	"birdie-and-claire/internal/errs"
	"birdie-and-claire/internal/models"
	"birdie-and-claire/internal/services"

	"github.com/danielgtaylor/huma/v2"
)

type RecommendationController struct {
	service services.RecommendationService
}

func NewRecommendationController(service services.RecommendationService) *RecommendationController {
	return &RecommendationController{service: service}
}

type CreateRecommendationsInput struct {
	Body models.RecommendationRequest
}

var _ huma.Resolver = (*CreateRecommendationsInput)(nil)

func (input *CreateRecommendationsInput) Resolve(huma.Context) []error {
	input.Body.Query = strings.TrimSpace(input.Body.Query)
	if input.Body.Query == "" {
		return []error{&huma.ErrorDetail{Location: "body.query", Message: "query must not be blank"}}
	}
	return nil
}

type RecommendationOutput struct {
	Body models.RecommendationResponse
}

func (c *RecommendationController) Create(ctx context.Context, input *CreateRecommendationsInput) (*RecommendationOutput, error) {
	response, err := c.service.Recommend(ctx, input.Body.Query)
	if err != nil {
		return nil, errs.ToHuma(ctx, err)
	}
	return &RecommendationOutput{Body: response}, nil
}
