package services

import (
	"context"

	"example_project/internal/errs"
	"example_project/internal/log"
	"example_project/internal/models"
	"example_project/internal/repository"

	"github.com/google/uuid"
)

// ProductImageService lists a product's images. Population from Shopify is a
// separate job; this service only reads what that job has written.
type ProductImageService interface {
	ListByProductID(ctx context.Context, productID uuid.UUID) ([]models.ProductImageResponse, error)
}

var _ ProductImageService = (*productImageService)(nil)

type productImageService struct {
	repo *repository.Repository
}

func NewProductImageService(repo *repository.Repository) ProductImageService {
	return &productImageService{repo: repo}
}

func (s *productImageService) ListByProductID(ctx context.Context, productID uuid.UUID) ([]models.ProductImageResponse, error) {
	exists, err := s.repo.ProductImage.ProductExists(ctx, productID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, errs.ErrNotFound
	}

	images, err := s.repo.ProductImage.FindByProductID(ctx, productID)
	if err != nil {
		return nil, err
	}
	log.Info(ctx, "listed product images", "product_id", productID, "count", len(images))

	responses := make([]models.ProductImageResponse, 0, len(images))
	for _, image := range images {
		responses = append(responses, models.ProductImageResponse{
			ID:        image.ID,
			URL:       image.URL,
			AltText:   image.AltText,
			Width:     image.Width,
			Height:    image.Height,
			Position:  image.Position,
			CreatedAt: image.CreatedAt,
			UpdatedAt: image.UpdatedAt,
		})
	}
	return responses, nil
}
