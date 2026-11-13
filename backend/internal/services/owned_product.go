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
	ListOwnedProducts(ctx context.Context, params pagination.CursorParams) (pagination.Page[models.OwnedProductResponse], error)
	// AddOwnedProducts fails with errs.ErrConflict when a product is not in the catalog.
	AddOwnedProducts(ctx context.Context, productIDs []uuid.UUID) error
	RemoveOwnedProduct(ctx context.Context, productID uuid.UUID) error
}

type ownedProductService struct {
	repo *repository.Repository
}

func NewOwnedProductService(repo *repository.Repository) OwnedProductService {
	return &ownedProductService{repo: repo}
}

func (s *ownedProductService) ListOwnedProducts(ctx context.Context, params pagination.CursorParams) (pagination.Page[models.OwnedProductResponse], error) {
	return s.repo.OwnedProduct.ListOwnedProducts(ctx, auth.UserID(ctx), params)
}

func (s *ownedProductService) AddOwnedProducts(ctx context.Context, productIDs []uuid.UUID) error {
	return s.repo.OwnedProduct.AddOwnedProducts(ctx, auth.UserID(ctx), productIDs)
}

func (s *ownedProductService) RemoveOwnedProduct(ctx context.Context, productID uuid.UUID) error {
	return s.repo.OwnedProduct.RemoveOwnedProduct(ctx, auth.UserID(ctx), productID)
}
