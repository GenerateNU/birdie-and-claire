package repository

import (
	"context"
	"database/sql"
	"fmt"

	"example_project/internal/models"

	"github.com/google/uuid"
)


type OutfitReactionRepository interface {
	Create(ctx context.Context, userID, outfitID uuid.UUID, kind models.ReactionKind) error
	CountByOutfit(ctx context.Context, outfitID uuid.UUID) (models.ReactionCounts, error)
}



type outfitReactionRepository struct {
	db *sql.DB
}

func NewOutfitReactionRepository(database *sql.DB) OutfitReactionRepository {
	return &outfitReactionRepository{db: database}
}


func (r *outfitReactionRepository) Create(ctx context.Context, userID, outfitID uuid.UUID, kind models.ReactionKind) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO outfit_reactions (user_id, outfit_id, kind)
		VALUES ($1, $2, $3)
	`, userID, outfitID, kind)
	if err != nil {
		return fmt.Errorf("create reaction for outfit %s: %w", outfitID, err)
	}
	return nil
}

func (r *outfitReactionRepository) CountByOutfit(ctx context.Context, outfitID uuid.UUID) (models.ReactionCounts, error) {
	var counts models.ReactionCounts
	err := r.db.QueryRowContext(ctx, `
		SELECT
			COUNT(*) FILTER (WHERE kind = 'like')    AS like_count,
			COUNT(*) FILTER (WHERE kind = 'dislike') AS dislike_count,
			COUNT(*) FILTER (WHERE kind = 'save')    AS save_count
		FROM outfit_reactions
		WHERE outfit_id = $1
	`, outfitID).Scan(&counts.Like, &counts.Dislike, &counts.Save)
	if err != nil {
		return models.ReactionCounts{}, fmt.Errorf("count reactions for outfit %s: %w", outfitID, err)
	}
	return counts, nil
}