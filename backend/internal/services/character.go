// Package services holds business logic, one file per resource. Services take
// validated input and return sentinel errors from internal/errs, never HTTP
// errors, so that non-HTTP callers can reuse them.
package services

import (
	"context"

	"example_project/internal/log"
	"example_project/internal/models"
	"example_project/internal/repository"
)

// CharacterService reads characters and derives their threat scores.
type CharacterService interface {
	ListByFaction(ctx context.Context, faction string) ([]models.CharacterResponse, error)
}

var _ CharacterService = (*characterService)(nil)

type characterService struct {
	repo *repository.Repository
}

func NewCharacterService(repo *repository.Repository) CharacterService {
	return &characterService{repo: repo}
}

func (s *characterService) ListByFaction(ctx context.Context, faction string) ([]models.CharacterResponse, error) {
	characters, err := s.repo.Character.FindByFaction(ctx, faction)
	if err != nil {
		return nil, err
	}
	log.Info(ctx, "listed characters", "faction", faction, "count", len(characters))

	responses := make([]models.CharacterResponse, 0, len(characters))
	for _, character := range characters {
		responses = append(responses, models.CharacterResponse{
			Character:   character,
			ThreatScore: character.ThreatScore(),
		})
	}
	return responses, nil
}
