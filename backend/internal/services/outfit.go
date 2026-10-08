package services

import (
	"context"

	"birdie-and-claire/internal/auth"
	"birdie-and-claire/internal/models"
	"birdie-and-claire/internal/repository"
	"birdie-and-claire/internal/utils/pagination"

	"github.com/google/uuid"
)

// OutfitService saves outfits for the authenticated user and reads them back.
type OutfitService interface {
	Create(ctx context.Context, params models.CreateOutfitParams) (models.OutfitResponse, error)
	Get(ctx context.Context, id uuid.UUID) (models.OutfitResponse, error)
	List(ctx context.Context, params pagination.CursorParams) (pagination.Page[models.Outfit], error)
}

type outfitService struct {
	repo *repository.Repository
}

func NewOutfitService(repo *repository.Repository) OutfitService {
	return &outfitService{repo: repo}
}

func (s *outfitService) Create(ctx context.Context, params models.CreateOutfitParams) (models.OutfitResponse, error) {
	userID := auth.UserID(ctx)
	// Without this, a caller with no account gets a 500 from the outfits.user_id foreign key instead of a 404.
	if _, err := s.repo.User.GetByID(ctx, userID); err != nil {
		return models.OutfitResponse{}, err
	}

	outfit, products, err := s.repo.Outfit.Create(ctx, params, userID)
	if err != nil {
		return models.OutfitResponse{}, err
	}
	return models.OutfitResponse{Outfit: outfit, Products: products}, nil
}

func (s *outfitService) Get(ctx context.Context, id uuid.UUID) (models.OutfitResponse, error) {
	outfit, products, err := s.repo.Outfit.GetByID(ctx, id)
	if err != nil {
		return models.OutfitResponse{}, err
	}
	return models.OutfitResponse{Outfit: outfit, Products: products}, nil
}

func (s *outfitService) List(ctx context.Context, params pagination.CursorParams) (pagination.Page[models.Outfit], error) {
	rows, err := s.repo.Outfit.List(ctx, auth.UserID(ctx), params)
	if err != nil {
		return pagination.Page[models.Outfit]{}, err
	}

	outfits, hasMore := pagination.Split(rows, params.Limit)
	page := pagination.Page[models.Outfit]{Items: outfits, HasMore: hasMore}
	if !hasMore {
		return page, nil
	}

	last := outfits[len(outfits)-1]
	nextCursor, err := pagination.CursorFields{"created_at": last.CreatedAt, "id": last.ID}.Encode()
	if err != nil {
		return pagination.Page[models.Outfit]{}, err
	}
	page.NextCursor = &nextCursor
	return page, nil
}
