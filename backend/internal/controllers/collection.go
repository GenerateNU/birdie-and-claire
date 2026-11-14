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

type CollectionController struct {
	service services.CollectionService
}

func NewCollectionController(service services.CollectionService) *CollectionController {
	return &CollectionController{service: service}
}

type CreateCollectionInput struct {
	Body struct {
		Name        string `json:"name" required:"true" minLength:"1" maxLength:"100" doc:"Display name for the collection"`
		Description string `json:"description,omitempty" maxLength:"250" doc:"Free-text description of the collection"`
	}
}

type CollectionSummaryOutput struct {
	Body models.CollectionSummaryResponse
}

func (c *CollectionController) Create(ctx context.Context, input *CreateCollectionInput) (*CollectionSummaryOutput, error) {
	collection, err := c.service.Create(ctx, models.CreateCollectionParams{
		Name:        input.Body.Name,
		Description: input.Body.Description,
	})
	if err != nil {
		return nil, errs.ToHuma(ctx, err)
	}
	return &CollectionSummaryOutput{Body: collection}, nil
}

type ListUserCollectionsInput struct {
	pagination.CursorParams
}

type ListUserCollectionsOutput struct {
	Body pagination.Page[models.CollectionSummaryResponse]
}

func (c *CollectionController) ListUserCollections(ctx context.Context, input *ListUserCollectionsInput) (*ListUserCollectionsOutput, error) {
	page, err := c.service.ListUserCollections(ctx, input.CursorParams)
	if err != nil {
		return nil, errs.ToHuma(ctx, err)
	}
	return &ListUserCollectionsOutput{Body: page}, nil
}

type CollectionIDInput struct {
	ID uuid.UUID `path:"id" doc:"Collection ID"`
}

type CollectionOutput struct {
	Body models.Collection
}

func (c *CollectionController) Get(ctx context.Context, input *CollectionIDInput) (*CollectionOutput, error) {
	collection, err := c.service.Get(ctx, input.ID)
	if err != nil {
		return nil, errs.ToHuma(ctx, err)
	}
	return &CollectionOutput{Body: collection}, nil
}

type ListCollectionOutfitsInput struct {
	CollectionIDInput
	pagination.CursorParams
}

type ListCollectionOutfitsOutput struct {
	Body pagination.Page[models.OutfitResponse]
}

func (c *CollectionController) ListCollectionOutfits(ctx context.Context, input *ListCollectionOutfitsInput) (*ListCollectionOutfitsOutput, error) {
	page, err := c.service.ListCollectionOutfits(ctx, input.ID, input.CursorParams)
	if err != nil {
		return nil, errs.ToHuma(ctx, err)
	}
	return &ListCollectionOutfitsOutput{Body: page}, nil
}

type UpdateCollectionInput struct {
	CollectionIDInput
	// An empty name is not a meaningful update, so a zero value means not provided.
	// An empty description is meaningful: it clears it, and only an absent or null field leaves it alone.
	Body struct {
		Name        string  `json:"name,omitempty" minLength:"1" maxLength:"100" doc:"New display name for the collection"`
		Description *string `json:"description,omitempty" maxLength:"250" doc:"New description; an empty string clears it"`
	}
}

var _ huma.Resolver = (*UpdateCollectionInput)(nil)

func (input *UpdateCollectionInput) Resolve(huma.Context) []error {
	if input.Body.Name == "" && input.Body.Description == nil {
		return []error{&huma.ErrorDetail{Location: "body", Message: "body must set name or description"}}
	}
	return nil
}

func (c *CollectionController) Update(ctx context.Context, input *UpdateCollectionInput) (*CollectionOutput, error) {
	collection, err := c.service.Update(ctx, input.ID, models.UpdateCollectionParams{
		Name:        input.Body.Name,
		Description: input.Body.Description,
	})
	if err != nil {
		return nil, errs.ToHuma(ctx, err)
	}
	return &CollectionOutput{Body: collection}, nil
}

func (c *CollectionController) Delete(ctx context.Context, input *CollectionIDInput) (*struct{}, error) {
	if err := c.service.Delete(ctx, input.ID); err != nil {
		return nil, errs.ToHuma(ctx, err)
	}
	return nil, nil
}
