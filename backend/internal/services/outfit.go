package services

import (
	"context"
	"fmt"
	"net/url"

	"birdie-and-claire/internal/auth"
	"birdie-and-claire/internal/models"
	"birdie-and-claire/internal/repository"
	"birdie-and-claire/internal/utils/pagination"

	"github.com/google/uuid"
)

// OutfitService saves outfits for the authenticated user, reads them back, and
// shares them by public link.
type OutfitService interface {
	Create(ctx context.Context, params models.CreateOutfitParams) (models.OutfitResponse, error)
	Get(ctx context.Context, id uuid.UUID) (models.OutfitResponse, error)
	Update(ctx context.Context, id uuid.UUID, params models.UpdateOutfitParams) (models.OutfitResponse, error)
	List(ctx context.Context, params pagination.CursorParams) (pagination.Page[models.Outfit], error)
	Share(ctx context.Context, id uuid.UUID) (models.ShareOutfitResponse, error)
	Unshare(ctx context.Context, id uuid.UUID) error
	GetShared(ctx context.Context, id uuid.UUID) (models.SharedOutfitResponse, error)
}

type outfitService struct {
	repo         *repository.Repository
	publicAPIURL string
}

func NewOutfitService(repo *repository.Repository, publicAPIURL string) OutfitService {
	return &outfitService{repo: repo, publicAPIURL: publicAPIURL}
}

func (s *outfitService) Create(ctx context.Context, params models.CreateOutfitParams) (models.OutfitResponse, error) {
	outfit, products, err := s.repo.Outfit.Create(ctx, params, auth.UserID(ctx))
	if err != nil {
		return models.OutfitResponse{}, err
	}
	return models.OutfitResponse{Outfit: outfit, Products: products}, nil
}

func (s *outfitService) Get(ctx context.Context, id uuid.UUID) (models.OutfitResponse, error) {
	outfit, products, err := s.repo.Outfit.GetByID(ctx, id, auth.UserID(ctx))
	if err != nil {
		return models.OutfitResponse{}, err
	}
	return models.OutfitResponse{Outfit: outfit, Products: products}, nil
}

func (s *outfitService) Update(ctx context.Context, id uuid.UUID, params models.UpdateOutfitParams) (models.OutfitResponse, error) {
	outfit, products, err := s.repo.Outfit.Update(ctx, id, params, auth.UserID(ctx))
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

func (s *outfitService) Share(ctx context.Context, id uuid.UUID) (models.ShareOutfitResponse, error) {
	if err := s.repo.Outfit.Share(ctx, id, auth.UserID(ctx)); err != nil {
		return models.ShareOutfitResponse{}, err
	}

	shareURL, err := url.JoinPath(s.publicAPIURL, "api/public/outfits", id.String())
	if err != nil {
		return models.ShareOutfitResponse{}, fmt.Errorf("build share url for outfit %s: %w", id, err)
	}
	return models.ShareOutfitResponse{URL: shareURL}, nil
}

func (s *outfitService) Unshare(ctx context.Context, id uuid.UUID) error {
	return s.repo.Outfit.Unshare(ctx, id, auth.UserID(ctx))
}

func (s *outfitService) GetShared(ctx context.Context, id uuid.UUID) (models.SharedOutfitResponse, error) {
	outfit, products, err := s.repo.Outfit.GetShared(ctx, id)
	if err != nil {
		return models.SharedOutfitResponse{}, err
	}
	return models.SharedOutfitResponse{ID: outfit.ID, Name: outfit.Name, Products: products}, nil
}
