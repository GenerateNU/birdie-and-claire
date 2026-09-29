package services

import (
	"context"

	"birdie-and-claire/internal/auth"
	"birdie-and-claire/internal/log"
	"birdie-and-claire/internal/models"
	"birdie-and-claire/internal/repository"

	"github.com/google/uuid"
)

// OutfitService saves outfits for the authenticated user and reads them back.
type OutfitService interface {
	Create(ctx context.Context, name string, productIDs []uuid.UUID) (models.Outfit, error)
	Get(ctx context.Context, id uuid.UUID) (models.OutfitWithProducts, error)
}

var _ OutfitService = (*outfitService)(nil)

type outfitService struct {
	repo *repository.Repository
}

func NewOutfitService(repo *repository.Repository) OutfitService {
	return &outfitService{repo: repo}
}

func (s *outfitService) Create(ctx context.Context, name string, productIDs []uuid.UUID) (models.Outfit, error) {
	outfit, err := s.repo.Outfit.Create(ctx, name, auth.UserID(ctx), productIDs)
	if err != nil {
		return models.Outfit{}, err
	}
	log.Info(ctx, "created outfit", "outfit_id", outfit.ID, "product_count", len(productIDs))
	return outfit, nil
}

func (s *outfitService) Get(ctx context.Context, id uuid.UUID) (models.OutfitWithProducts, error) {
	return s.repo.Outfit.FindByID(ctx, id)
}
