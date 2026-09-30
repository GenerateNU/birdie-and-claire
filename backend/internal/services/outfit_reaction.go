package services

import (
	"context"
	"errors"

	"example_project/internal/auth"
	"example_project/internal/errs"
	"example_project/internal/models"
	"example_project/internal/repository"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
)

var allowedReactionKinds = map[models.ReactionKind]bool{
	models.ReactionLike:    true,
	models.ReactionDislike: true,
	models.ReactionSave:    true,
}

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
	if !allowedReactionKinds[kind] {
		return errs.ErrInvalidInput
	}

	userID, err := uuid.Parse(auth.UserID(ctx))
	if err != nil {
		return errs.ErrInvalidInput
	}

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