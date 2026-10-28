package controllers

import (
	"context"
	"fmt"
	"slices"
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

var _ huma.Resolver = (*RecommendProductsInput)(nil)

// Resolve checks what the struct tags cannot: blank text, repeated keys, and values that depend on the key.
func (input *RecommendProductsInput) Resolve(huma.Context) []error {
	var problems []error
	input.Body.Occasion = strings.TrimSpace(input.Body.Occasion)
	if input.Body.Occasion == "" {
		problems = append(problems, &huma.ErrorDetail{Location: "body.occasion", Message: "occasion must not be blank"})
	}

	seen := make(map[models.RecommendationDetailKey]bool, len(input.Body.Details))
	for i := range input.Body.Details {
		detail := &input.Body.Details[i]
		location := fmt.Sprintf("body.details[%d]", i)
		if seen[detail.Key] {
			problems = append(problems, &huma.ErrorDetail{Location: location + ".key", Message: "key must not repeat", Value: detail.Key})
			continue
		}
		seen[detail.Key] = true

		switch detail.Key {
		case models.DetailWeather:
			if !slices.Contains(models.RecommendationWeathers, detail.Value) {
				problems = append(problems, &huma.ErrorDetail{Location: location + ".value", Message: "value must be a listed weather", Value: detail.Value})
			}
		case models.DetailVibe:
			if !slices.Contains(models.RecommendationVibes, detail.Value) {
				problems = append(problems, &huma.ErrorDetail{Location: location + ".value", Message: "value must be a listed vibe", Value: detail.Value})
			}
		case models.DetailCustom:
			detail.Value = strings.TrimSpace(detail.Value)
			if detail.Value == "" {
				problems = append(problems, &huma.ErrorDetail{Location: location + ".value", Message: "value must not be blank"})
			}
		}
	}
	return problems
}

type RecommendProductsOutput struct {
	Body models.RecommendationResponse
}

func (c *RecommendationController) RecommendProducts(ctx context.Context, input *RecommendProductsInput) (*RecommendProductsOutput, error) {
	response, err := c.service.RecommendProducts(ctx, input.Body)
	if err != nil {
		return nil, errs.ToHuma(ctx, err)
	}
	return &RecommendProductsOutput{Body: response}, nil
}
