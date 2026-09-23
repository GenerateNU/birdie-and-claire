// Package services holds business logic, one file per resource. Services take
// validated input and return sentinel errors from internal/errs, never HTTP
// errors, so that non-HTTP callers can reuse them.
package services

import (
	"context"

	"example_project/internal/log"
	"example_project/internal/models"
	"example_project/internal/repository"
	"example_project/internal/utils/pagination"
)

// CharacterService reads characters and derives their threat scores.
type CharacterService interface {
	ListByFaction(ctx context.Context, faction string, params pagination.Params) (pagination.Page[models.CharacterResponse], error)
	ListRanked(ctx context.Context, params pagination.Params) (pagination.Page[models.CharacterResponse], error)
}

var _ CharacterService = (*characterService)(nil)

type characterService struct {
	repo *repository.Repository
}

func NewCharacterService(repo *repository.Repository) CharacterService {
	return &characterService{repo: repo}
}

func (s *characterService) ListByFaction(ctx context.Context, faction string, params pagination.Params) (pagination.Page[models.CharacterResponse], error) {
	characters, err := s.repo.Character.FindByFaction(ctx, faction, params)
	if err != nil {
		return pagination.Page[models.CharacterResponse]{}, err
	}

	rows, hasMore := pagination.Split(characters, params.Limit)
	log.Info(ctx, "listed characters", "faction", faction, "count", len(rows))

	return characterPage(rows, hasMore, func(last models.Character) pagination.Fields {
		return pagination.Fields{"id": last.ID}
	})
}

func (s *characterService) ListRanked(ctx context.Context, params pagination.Params) (pagination.Page[models.CharacterResponse], error) {
	characters, err := s.repo.Character.FindRanked(ctx, params)
	if err != nil {
		return pagination.Page[models.CharacterResponse]{}, err
	}

	rows, hasMore := pagination.Split(characters, params.Limit)
	log.Info(ctx, "listed ranked characters", "count", len(rows))

	return characterPage(rows, hasMore, func(last models.Character) pagination.Fields {
		return pagination.Fields{"power_level": last.PowerLevel, "id": last.ID}
	})
}

// characterPage wraps a trimmed page in the response shape. Each listing supplies
// only the columns its own sort key uses, from the last row on the page.
func characterPage(
	rows []models.Character,
	hasMore bool,
	cursorFor func(last models.Character) pagination.Fields,
) (pagination.Page[models.CharacterResponse], error) {
	responses := make([]models.CharacterResponse, 0, len(rows))
	for _, character := range rows {
		responses = append(responses, models.CharacterResponse{Character: character, ThreatScore: character.ThreatScore()})
	}

	var nextCursor *string
	if hasMore {
		cursor, err := cursorFor(rows[len(rows)-1]).Encode()
		if err != nil {
			return pagination.Page[models.CharacterResponse]{}, err
		}
		nextCursor = &cursor
	}

	return pagination.Page[models.CharacterResponse]{Items: responses, NextCursor: nextCursor, HasMore: hasMore}, nil
}
