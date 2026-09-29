package controllers

import (
	"context"

	"birdie-and-claire/internal/errs"
	"birdie-and-claire/internal/models"
	"birdie-and-claire/internal/services"

	"github.com/google/uuid"
)

type OutfitController struct {
	service services.OutfitService
}

func NewOutfitController(service services.OutfitService) *OutfitController {
	return &OutfitController{service: service}
}

type CreateOutfitInput struct {
	Body struct {
		Name       string      `json:"name" required:"true"`
		ProductIDs []uuid.UUID `json:"product_ids" required:"true" nullable:"false" minItems:"1" uniqueItems:"true"`
	}
}

type OutfitOutput struct {
	Body models.OutfitWithProducts
}

// Create saves an outfit for the authenticated user and returns it with its products.
func (c *OutfitController) Create(ctx context.Context, input *CreateOutfitInput) (*OutfitOutput, error) {
	outfit, err := c.service.Create(ctx, input.Body.Name, input.Body.ProductIDs)
	if err != nil {
		return nil, errs.ToHuma(err)
	}
	// Re-read so the response has the same shape as GET.
	saved, err := c.service.Get(ctx, outfit.ID)
	if err != nil {
		return nil, errs.ToHuma(err)
	}
	return &OutfitOutput{Body: saved}, nil
}

type GetOutfitInput struct {
	ID uuid.UUID `path:"id"`
}

// Get returns an outfit with its products.
func (c *OutfitController) Get(ctx context.Context, input *GetOutfitInput) (*OutfitOutput, error) {
	outfit, err := c.service.Get(ctx, input.ID)
	if err != nil {
		return nil, errs.ToHuma(err)
	}
	return &OutfitOutput{Body: outfit}, nil
}
