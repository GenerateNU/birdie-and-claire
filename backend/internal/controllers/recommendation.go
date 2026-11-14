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

		if problem := checkDetailValue(detail, location+".value"); problem != nil {
			problems = append(problems, problem)
		}
	}
	return problems
}

// checkDetailValue checks a detail's value against its key, trimming custom first. It returns nil when the value is valid.
func checkDetailValue(detail *models.RecommendationDetail, location string) *huma.ErrorDetail {
	switch detail.Key {
	case models.DetailWeather:
		if !slices.Contains(models.RecommendationWeathers, detail.Value) {
			return &huma.ErrorDetail{Location: location, Message: "value must be a listed weather", Value: detail.Value}
		}
	case models.DetailSetting:
		if !slices.Contains(models.RecommendationSettings, detail.Value) {
			return &huma.ErrorDetail{Location: location, Message: "value must be a listed setting", Value: detail.Value}
		}
	case models.DetailConditions:
		if !distinctListedConditions(detail.Value) {
			return &huma.ErrorDetail{Location: location, Message: "value must be distinct listed conditions separated by commas", Value: detail.Value}
		}
	case models.DetailVibe:
		if !slices.Contains(models.RecommendationVibes, detail.Value) {
			return &huma.ErrorDetail{Location: location, Message: "value must be a listed vibe", Value: detail.Value}
		}
	case models.DetailCustom:
		detail.Value = strings.TrimSpace(detail.Value)
		if detail.Value == "" {
			return &huma.ErrorDetail{Location: location, Message: "value must not be blank"}
		}
	}
	return nil
}

func distinctListedConditions(value string) bool {
	conditions := strings.Split(value, ",")
	for i, condition := range conditions {
		if !slices.Contains(models.RecommendationConditions, condition) || slices.Contains(conditions[:i], condition) {
			return false
		}
	}
	return true
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
