package controllers

import (
	"context"

	"birdie-and-claire/internal/errs"
	"birdie-and-claire/internal/models"
	"birdie-and-claire/internal/services"

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

type CollectionOutput struct {
	Body models.CollectionResponse
}

func (c *CollectionController) Create(ctx context.Context, input *CreateCollectionInput) (*CollectionOutput, error) {
	collection, err := c.service.Create(ctx, models.CreateCollectionParams{
		Name:        input.Body.Name,
		Description: input.Body.Description,
	})
	if err != nil {
		return nil, errs.ToHuma(ctx, err)
	}
	return &CollectionOutput{Body: collection}, nil
}

type ListCollectionsOutput struct {
	Body models.ListCollectionsResponse
}

func (c *CollectionController) List(ctx context.Context, _ *struct{}) (*ListCollectionsOutput, error) {
	collections, err := c.service.List(ctx)
	if err != nil {
		return nil, errs.ToHuma(ctx, err)
	}
	return &ListCollectionsOutput{Body: collections}, nil
}

type CollectionIDInput struct {
	ID uuid.UUID `path:"id" doc:"Collection ID"`
}

type CollectionDetailOutput struct {
	Body models.CollectionDetailResponse
}

func (c *CollectionController) Get(ctx context.Context, input *CollectionIDInput) (*CollectionDetailOutput, error) {
	collection, err := c.service.Get(ctx, input.ID)
	if err != nil {
		return nil, errs.ToHuma(ctx, err)
	}
	return &CollectionDetailOutput{Body: collection}, nil
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
