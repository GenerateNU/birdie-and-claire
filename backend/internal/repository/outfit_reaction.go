package repository

import (
	"context"
	"database/sql"

	"example_project/internal/models"

	"github.com/google/uuid"
)

// OutfitReactionRepository owns the outfit_reactions table.
type OutfitReactionRepository interface {
	Create(ctx context.Context, userID, outfitID uuid.UUID, kind models.ReactionKind) error
	CountByOutfit(ctx context.Context, outfitID uuid.UUID) (models.ReactionCounts, error)
}

var _ OutfitReactionRepository = (*outfitReactionRepository)(nil)

type outfitReactionRepository struct {
	db *sql.DB
}

func NewOutfitReactionRepository(database *sql.DB) OutfitReactionRepository {
	return &outfitReactionRepository{db: database}
}

// Create records a new reaction. Reactions are append-only, so this always
// inserts a new row rather than updating an existing one.
func (r *outfitReactionRepository) Create(ctx context.Context, userID, outfitID uuid.UUID, kind models.ReactionKind) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO outfit_reactions (user_id, outfit_id, kind)
		VALUES ($1, $2, $3)
	`, userID, outfitID, kind)
	return err
}

// CountByOutfit returns how many of each reaction kind an outfit has.
func (r *outfitReactionRepository) CountByOutfit(ctx context.Context, outfitID uuid.UUID) (models.ReactionCounts, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT kind, COUNT(*)
		FROM outfit_reactions
		WHERE outfit_id = $1
		GROUP BY kind
	`, outfitID)
	if err != nil {
		return models.ReactionCounts{}, err
	}
	defer rows.Close()

	var counts models.ReactionCounts
	for rows.Next() {
		var kind string
		var count int
		if err := rows.Scan(&kind, &count); err != nil {
			return models.ReactionCounts{}, err
		}
		switch models.ReactionKind(kind) {
		case models.ReactionLike:
			counts.Like = count
		case models.ReactionDislike:
			counts.Dislike = count
		case models.ReactionSave:
			counts.Save = count
		}
	}
	return counts, rows.Err()
}