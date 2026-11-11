package services

import (
	"context"

	"birdie-and-claire/internal/auth"
	"birdie-and-claire/internal/models"
	"birdie-and-claire/internal/repository"
	"birdie-and-claire/internal/utils/pagination"

	"github.com/google/uuid"
)

// OwnedProductService keeps the catalog products the authenticated user owns.
type OwnedProductService interface {
	List(ctx context.Context, params pagination.CursorParams) (pagination.Page[models.OwnedProductResponse], error)
	// Add fails with errs.ErrConflict when a product is not in the catalog.
	Add(ctx context.Context, productIDs []uuid.UUID) error
	Remove(ctx context.Context, productID uuid.UUID) error
}

type ownedProductService struct {
	repo *repository.Repository
}

func NewOwnedProductService(repo *repository.Repository) OwnedProductService {
	return &ownedProductService{repo: repo}
}

func (s *ownedProductService) List(ctx context.Context, params pagination.CursorParams) (pagination.Page[models.OwnedProductResponse], error) {
	rows, err := s.repo.OwnedProduct.List(ctx, auth.UserID(ctx), params)
	if err != nil {
		return pagination.Page[models.OwnedProductResponse]{}, err
	}

	owned, hasMore := pagination.Split(rows, params.Limit)
	page := pagination.Page[models.OwnedProductResponse]{Items: owned, HasMore: hasMore}
	if !hasMore {
		return page, nil
	}

	last := owned[len(owned)-1]
	nextCursor, err := pagination.CursorFields{"added_at": last.AddedAt, "product_id": last.ID}.Encode()
	if err != nil {
		return pagination.Page[models.OwnedProductResponse]{}, err
	}
	page.NextCursor = &nextCursor
	return page, nil
}

func (s *ownedProductService) Add(ctx context.Context, productIDs []uuid.UUID) error {
	return s.repo.OwnedProduct.Add(ctx, auth.UserID(ctx), productIDs)
}

func (s *ownedProductService) Remove(ctx context.Context, productID uuid.UUID) error {
	return s.repo.OwnedProduct.Remove(ctx, auth.UserID(ctx), productID)
}
