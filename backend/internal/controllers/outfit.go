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
		return nil, errs.ToHuma(ctx, err)
	}
	return &OutfitOutput{Body: outfit}, nil
}

type OutfitIDInput struct {
	ID uuid.UUID `path:"id" doc:"Outfit ID"`
}

// Get returns one of the authenticated user's outfits with its products.
func (c *OutfitController) Get(ctx context.Context, input *OutfitIDInput) (*OutfitOutput, error) {
	outfit, err := c.service.Get(ctx, input.ID)
	if err != nil {
		return nil, errs.ToHuma(ctx, err)
	}
	return &OutfitOutput{Body: outfit}, nil
}

type UpdateOutfitInput struct {
	OutfitIDInput
	// An empty name or product list is not a meaningful update, so a zero value means not provided.
	Body struct {
		Name       string      `json:"name,omitempty" minLength:"1" maxLength:"100" doc:"New display name for the outfit"`
		ProductIDs []uuid.UUID `json:"product_ids,omitempty" nullable:"false" minItems:"1" doc:"IDs of every product in the outfit; replaces the current set"`
	}
}

var _ huma.Resolver = (*UpdateOutfitInput)(nil)

func (input *UpdateOutfitInput) Resolve(huma.Context) []error {
	if input.Body.Name == "" && len(input.Body.ProductIDs) == 0 {
		return []error{&huma.ErrorDetail{Location: "body", Message: "body must set name or product_ids"}}
	}
	seen := make(map[uuid.UUID]bool, len(input.Body.ProductIDs))
	for _, id := range input.Body.ProductIDs {
		if seen[id] {
			return []error{huma.Error400BadRequest("duplicate product id")}
		}
		seen[id] = true
	}
	return nil
}

func (c *OutfitController) Update(ctx context.Context, input *UpdateOutfitInput) (*OutfitOutput, error) {
	outfit, err := c.service.Update(ctx, input.ID, models.UpdateOutfitParams{
		Name:       input.Body.Name,
		ProductIDs: input.Body.ProductIDs,
	})
	if err != nil {
		return nil, errs.ToHuma(ctx, err)
	}
	return &OutfitOutput{Body: outfit}, nil
}

type ShareOutfitOutput struct {
	Body models.ShareOutfitResponse
}

// Share makes one of the authenticated user's outfits public and returns its link.
func (c *OutfitController) Share(ctx context.Context, input *OutfitIDInput) (*ShareOutfitOutput, error) {
	share, err := c.service.Share(ctx, input.ID)
	if err != nil {
		return nil, errs.ToHuma(ctx, err)
	}
	return &ShareOutfitOutput{Body: share}, nil
}

// Unshare makes one of the authenticated user's outfits private again.
func (c *OutfitController) Unshare(ctx context.Context, input *OutfitIDInput) (*struct{}, error) {
	if err := c.service.Unshare(ctx, input.ID); err != nil {
		return nil, errs.ToHuma(ctx, err)
	}
	return nil, nil
}

type SharedOutfitOutput struct {
	Body models.SharedOutfitResponse
}

// GetShared returns a shared outfit to anyone, signed in or not.
func (c *OutfitController) GetShared(ctx context.Context, input *OutfitIDInput) (*SharedOutfitOutput, error) {
	outfit, err := c.service.GetShared(ctx, input.ID)
	if err != nil {
		return nil, errs.ToHuma(ctx, err)
	}
	return &SharedOutfitOutput{Body: outfit}, nil
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
		return nil, errs.ToHuma(ctx, err)
	}
	return &ListOutfitsOutput{Body: page}, nil
}

type SuggestOutfitItemsInput struct {
	OutfitIDInput
	ProductID uuid.UUID `query:"product_id" required:"true" doc:"The outfit product to find similar products for"`
	Limit     int       `query:"limit" default:"12" minimum:"1" maximum:"30" doc:"Most products to return"`
}

type SuggestOutfitItemsOutput struct {
	Body models.OutfitSuggestionsResponse
}

// SuggestItems returns products similar to one of the outfit's products, closest first.
func (c *OutfitController) SuggestItems(ctx context.Context, input *SuggestOutfitItemsInput) (*SuggestOutfitItemsOutput, error) {
	suggestions, err := c.service.Suggest(ctx, input.ID, input.ProductID, input.Limit)
	if err != nil {
		return nil, errs.ToHuma(ctx, err)
	}
	return &SuggestOutfitItemsOutput{Body: suggestions}, nil
}
