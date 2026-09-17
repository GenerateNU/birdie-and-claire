// Package controllers adapts HTTP to the service layer, one file per resource.
// Huma parses and validates every input before a handler runs, so controllers
// only translate service errors into responses.
package controllers

import (
	"context"

	"example_project/internal/errs"
	"example_project/internal/models"
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
}

type ListCharactersOutput struct {
	Body []models.CharacterResponse
}

// List returns every character in a faction, each with a computed threat score.
func (c *CharacterController) List(ctx context.Context, input *ListCharactersInput) (*ListCharactersOutput, error) {
	characters, err := c.service.ListByFaction(ctx, input.Faction)
	if err != nil {
		return nil, errs.ToHuma(err)
	}
	return &ListCharactersOutput{Body: characters}, nil
}
