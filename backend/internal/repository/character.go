package repository

import (
	"context"
	"database/sql"
	"fmt"

	"example_project/internal/models"
	"example_project/internal/utils/pagination"
)

type CharacterRepository interface {
	// FindByFaction returns up to Limit+1 characters in faction, ordered by id.
	// The extra row is how the caller learns hasMore; trim it with pagination.Split.
	FindByFaction(ctx context.Context, faction string, params pagination.CursorParams) ([]models.Character, error)
}

var _ CharacterRepository = (*characterRepository)(nil)

type characterRepository struct {
	db *sql.DB
}

func NewCharacterRepository(database *sql.DB) CharacterRepository {
	return &characterRepository{db: database}
}

// FindByFaction implements CharacterRepository; id alone orders rows.
func (r *characterRepository) FindByFaction(ctx context.Context, faction string, params pagination.CursorParams) ([]models.Character, error) {
	afterID, err := params.After().Int64("id")
	if err != nil {
		return nil, err
	}

	rows, err := r.db.QueryContext(ctx, `
		SELECT id, name, species, faction, force_sensitive, power_level
		FROM characters
		WHERE faction = $1
		  AND ($2::bigint IS NULL OR id > $2::bigint)
		ORDER BY id
		LIMIT $3
	`, faction, afterID, params.Limit+1)
	if err != nil {
		return nil, fmt.Errorf("query characters: %w", err)
	}
	defer func() { _ = rows.Close() }()

	characters := make([]models.Character, 0)
	for rows.Next() {
		var character models.Character
		if err := rows.Scan(
			&character.ID,
			&character.Name,
			&character.Species,
			&character.Faction,
			&character.ForceSensitive,
			&character.PowerLevel,
		); err != nil {
			return nil, fmt.Errorf("scan character: %w", err)
		}
		characters = append(characters, character)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate characters: %w", err)
	}
	return characters, nil
}
