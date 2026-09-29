package controllers

import (
	"context"

	"birdie-and-claire/internal/errs"
	"birdie-and-claire/internal/models"
	"birdie-and-claire/internal/services"

	"github.com/danielgtaylor/huma/v2"
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
		Name       string      `json:"name" required:"true" minLength:"1" maxLength:"100" doc:"Display name for the outfit"`
		ProductIDs []uuid.UUID `json:"product_ids" required:"true" nullable:"false" minItems:"1" uniqueItems:"true" doc:"IDs of the products in the outfit"`
	}
}

var _ huma.Resolver = (*CreateOutfitInput)(nil)

// Resolve catches duplicates uniqueItems misses: it compares raw JSON strings, so
// differently cased spellings of one UUID pass it but parse to the same value.
func (input *CreateOutfitInput) Resolve(huma.Context) []error {
	seen := make(map[uuid.UUID]bool, len(input.Body.ProductIDs))
	for _, id := range input.Body.ProductIDs {
		if seen[id] {
			return []error{huma.Error400BadRequest("duplicate product id")}
		}
		seen[id] = true
	}
	return nil
}

type OutfitOutput struct {
	Body models.OutfitResponse
}

// Create saves an outfit for the authenticated user and returns it with its products.
func (c *OutfitController) Create(ctx context.Context, input *CreateOutfitInput) (*OutfitOutput, error) {
	outfit, err := c.service.Create(ctx, input.Body.Name, input.Body.ProductIDs)
	if err != nil {
		return nil, errs.ToHuma(err)
	}
	return &OutfitOutput{Body: outfit}, nil
}

type GetOutfitInput struct {
	ID uuid.UUID `path:"id" doc:"Outfit ID"`
}

// Get returns an outfit with its products.
func (c *OutfitController) Get(ctx context.Context, input *GetOutfitInput) (*OutfitOutput, error) {
	outfit, err := c.service.Get(ctx, input.ID)
	if err != nil {
		return nil, errs.ToHuma(err)
	}
	return &OutfitOutput{Body: outfit}, nil
}
