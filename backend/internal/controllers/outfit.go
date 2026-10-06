package controllers

import (
	"context"

	"birdie-and-claire/internal/errs"
	"birdie-and-claire/internal/models"
	"birdie-and-claire/internal/services"
	"birdie-and-claire/internal/utils/pagination"

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
		ProductIDs []uuid.UUID `json:"product_ids" required:"true" nullable:"false" minItems:"1" doc:"IDs of the products in the outfit"`
	}
}

var _ huma.Resolver = (*CreateOutfitInput)(nil)

// Resolve compares parsed UUIDs, so differently cased spellings of one ID still count as duplicates.
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
	outfit, err := c.service.Create(ctx, models.CreateOutfitParams{
		Name:       input.Body.Name,
		ProductIDs: input.Body.ProductIDs,
	})
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

type ListOutfitsInput struct {
	pagination.CursorParams
}

type ListOutfitsOutput struct {
	Body pagination.Page[models.Outfit]
}

// List returns a page of the authenticated user's outfits, newest first.
func (c *OutfitController) List(ctx context.Context, input *ListOutfitsInput) (*ListOutfitsOutput, error) {
	page, err := c.service.List(ctx, input.CursorParams)
	if err != nil {
		return nil, errs.ToHuma(err)
	}
	return &ListOutfitsOutput{Body: page}, nil
}
