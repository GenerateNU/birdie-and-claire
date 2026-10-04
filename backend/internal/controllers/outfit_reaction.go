package controllers

import (
	"context"

	"example_project/internal/errs"
	"example_project/internal/models"
	"example_project/internal/services"

	"github.com/google/uuid"
)

type OutfitReactionController struct {
	service services.OutfitReactionService
}

func NewOutfitReactionController(service services.OutfitReactionService) *OutfitReactionController {
	return &OutfitReactionController{service: service}
}

type CreateReactionInput struct {
	ID   uuid.UUID `path:"id" doc:"Outfit ID"`
	Body struct {
		Kind models.ReactionKind `json:"kind" enum:"like,dislike,save" doc:"Reaction kind: like, dislike, or save"`
	}
}

type CreateReactionOutput struct{}

// Create records a reaction from the authenticated user against an outfit.
func (c *OutfitReactionController) Create(ctx context.Context, input *CreateReactionInput) (*CreateReactionOutput, error) {
	if err := c.service.Create(ctx, input.ID, input.Body.Kind); err != nil {
		return nil, errs.ToHuma(err)
	}
	return &CreateReactionOutput{}, nil
}

type GetReactionCountsInput struct {
	ID uuid.UUID `path:"id" doc:"Outfit ID"`
}

type GetReactionCountsOutput struct {
	Body models.ReactionCounts
}

// GetCounts returns aggregate reaction counts per kind for an outfit.
func (c *OutfitReactionController) GetCounts(ctx context.Context, input *GetReactionCountsInput) (*GetReactionCountsOutput, error) {
	counts, err := c.service.CountByOutfit(ctx, input.ID)
	if err != nil {
		return nil, errs.ToHuma(err)
	}
	return &GetReactionCountsOutput{Body: counts}, nil
}