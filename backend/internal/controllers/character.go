// Package controllers adapts HTTP to the service layer, one file per resource.
// Huma parses and validates every input before a handler runs, so controllers
// only translate service errors into responses.
package controllers

import (
	"context"

	"example_project/internal/errs"
	"example_project/internal/models"
	"example_project/internal/pagination"
	"example_project/internal/services"
)

type CharacterController struct {
	service services.CharacterService
}

func NewCharacterController(service services.CharacterService) *CharacterController {
	return &CharacterController{service: service}
}

type ListCharactersInput struct {
	Faction string `query:"faction" required:"true" enum:"rebel,empire,jedi,sith,neutral" doc:"Faction to filter by"`
	pagination.Params
}

type ListCharactersOutput struct {
	Body pagination.Page[models.CharacterResponse]
}

// List returns a page of characters in a faction, each with a threat score.
func (c *CharacterController) List(ctx context.Context, input *ListCharactersInput) (*ListCharactersOutput, error) {
	page, err := c.service.ListByFaction(ctx, input.Faction, input.Params)
	if err != nil {
		return nil, errs.ToHuma(err)
	}
	return &ListCharactersOutput{Body: page}, nil
}

type ListRankedCharactersInput struct {
	pagination.Params
}

type ListRankedCharactersOutput struct {
	Body pagination.Page[models.CharacterResponse]
}

// Ranked returns a page of characters across every faction, strongest first.
func (c *CharacterController) Ranked(ctx context.Context, input *ListRankedCharactersInput) (*ListRankedCharactersOutput, error) {
	page, err := c.service.ListRanked(ctx, input.Params)
	if err != nil {
		return nil, errs.ToHuma(err)
	}
	return &ListRankedCharactersOutput{Body: page}, nil
}
