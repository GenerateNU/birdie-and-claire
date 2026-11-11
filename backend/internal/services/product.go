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
	// List leaves out the products the user already owns.
	List(ctx context.Context, params pagination.CursorParams) (pagination.Page[models.ProductResponse], error)
}

type productService struct {
	repo *repository.Repository
}

func NewProductService(repo *repository.Repository) ProductService {
	return &productService{repo: repo}
}

func (s *productService) List(ctx context.Context, params pagination.CursorParams) (pagination.Page[models.ProductResponse], error) {
	rows, err := s.repo.Product.List(ctx, auth.UserID(ctx), params)
	if err != nil {
		return pagination.Page[models.ProductResponse]{}, err
	}

	products, hasMore := pagination.Split(rows, params.Limit)
	page := pagination.Page[models.ProductResponse]{Items: products, HasMore: hasMore}
	if !hasMore {
		return page, nil
	}

	last := products[len(products)-1]
	nextCursor, err := pagination.CursorFields{"created_at": last.CreatedAt, "id": last.ID}.Encode()
	if err != nil {
		return pagination.Page[models.ProductResponse]{}, err
	}
	page.NextCursor = &nextCursor
	return page, nil
}
