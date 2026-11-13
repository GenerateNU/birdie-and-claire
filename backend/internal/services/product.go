package services

import (
	"context"

	"birdie-and-claire/internal/auth"
	"birdie-and-claire/internal/models"
	"birdie-and-claire/internal/repository"
	"birdie-and-claire/internal/utils/pagination"
)

// ProductService lists the catalog for the authenticated user to pick pieces from.
type ProductService interface {
	ListUnownedProducts(ctx context.Context, params pagination.CursorParams) (pagination.Page[models.ProductResponse], error)
}

type productService struct {
	repo *repository.Repository
}

func NewProductService(repo *repository.Repository) ProductService {
	return &productService{repo: repo}
}

func (s *productService) ListUnownedProducts(ctx context.Context, params pagination.CursorParams) (pagination.Page[models.ProductResponse], error) {
	return s.repo.Product.ListUnownedProducts(ctx, auth.UserID(ctx), params)
}
