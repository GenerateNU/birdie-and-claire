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

type RecommendProductsInput struct {
	Body models.RecommendationRequest
}

func (input *RecommendProductsInput) Resolve(huma.Context) []error {
	input.Body.Query = strings.TrimSpace(input.Body.Query)
	if input.Body.Query == "" {
		return []error{&huma.ErrorDetail{Location: "body.query", Message: "query must not be blank"}}
	}
	return nil
}

type RecommendProductsOutput struct {
	Body models.RecommendationResponse
}

func (c *RecommendationController) RecommendProducts(ctx context.Context, input *RecommendProductsInput) (*RecommendProductsOutput, error) {
	response, err := c.service.RecommendProducts(ctx, input.Body.Query)
	if err != nil {
		return nil, errs.ToHuma(ctx, err)
	}
	return &RecommendProductsOutput{Body: response}, nil
}
