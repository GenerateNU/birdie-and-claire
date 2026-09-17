package repository

import (
	"context"
	"database/sql"
	"fmt"

	"example_project/internal/models"
)

type CharacterRepository interface {
	FindByFaction(ctx context.Context, faction string) ([]models.Character, error)
}

var _ CharacterRepository = (*characterRepository)(nil)

type characterRepository struct {
	db *sql.DB
}

func NewCharacterRepository(database *sql.DB) CharacterRepository {
	return &characterRepository{db: database}
}

func (r *characterRepository) FindByFaction(ctx context.Context, faction string) ([]models.Character, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, name, species, faction, force_sensitive, power_level
		FROM characters
		WHERE faction = $1
		ORDER BY id
	`, faction)
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
