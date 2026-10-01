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
	Create(ctx context.Context, params models.CreateOutfitParams) (models.OutfitResponse, error)
	Get(ctx context.Context, id uuid.UUID) (models.OutfitResponse, error)
}

var _ OutfitService = (*outfitService)(nil)

type outfitService struct {
	repo *repository.Repository
}

func NewOutfitService(repo *repository.Repository) OutfitService {
	return &outfitService{repo: repo}
}

func (s *outfitService) Create(ctx context.Context, params models.CreateOutfitParams) (models.OutfitResponse, error) {
	userID := auth.UserID(ctx)
	// outfits.user_id references users, and nothing else creates that row yet.
	if err := s.repo.User.EnsureExists(ctx, userID); err != nil {
		return models.OutfitResponse{}, err
	}

	outfit, products, err := s.repo.Outfit.Create(ctx, params, userID)
	if err != nil {
		return models.OutfitResponse{}, err
	}
	log.Info(ctx, "created outfit", "outfit_id", outfit.ID, "product_count", len(products))
	return models.OutfitResponse{Outfit: outfit, Products: products}, nil
}

func (s *outfitService) Get(ctx context.Context, id uuid.UUID) (models.OutfitResponse, error) {
	outfit, products, err := s.repo.Outfit.GetByID(ctx, id)
	if err != nil {
		return models.OutfitResponse{}, err
	}
	return models.OutfitResponse{Outfit: outfit, Products: products}, nil
}
