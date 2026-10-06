package services

import (
	"context"
	"errors"

	"birdie-and-claire/internal/auth"
	"birdie-and-claire/internal/errs"
	"birdie-and-claire/internal/models"
	"birdie-and-claire/internal/repository"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
)

// OutfitReactionService records reactions and reports aggregate counts.
type OutfitReactionService interface {
	Create(ctx context.Context, outfitID uuid.UUID, kind models.ReactionKind) error
	CountByOutfit(ctx context.Context, outfitID uuid.UUID) (models.ReactionCounts, error)
}

var _ OutfitReactionService = (*outfitReactionService)(nil)

type outfitReactionService struct {
	repo *repository.Repository
}

func NewOutfitReactionService(repo *repository.Repository) OutfitReactionService {
	return &outfitReactionService{repo: repo}
}

// Create records a reaction from the authenticated user. The outfit's
// existence is enforced by the database's foreign key, not checked here.
func (s *outfitReactionService) Create(ctx context.Context, outfitID uuid.UUID, kind models.ReactionKind) error {
	userID := auth.UserID(ctx)

	if err := s.repo.OutfitReaction.Create(ctx, userID, outfitID, kind); err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23503" { // foreign_key_violation
			return errs.ErrNotFound
		}
		return err
	}
	return nil
}

func (s *outfitReactionService) CountByOutfit(ctx context.Context, outfitID uuid.UUID) (models.ReactionCounts, error) {
	return s.repo.OutfitReaction.CountByOutfit(ctx, outfitID)
}
