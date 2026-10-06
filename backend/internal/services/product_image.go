package services

import (
	"context"

	"birdie-and-claire/internal/errs"
	"birdie-and-claire/internal/log"
	"birdie-and-claire/internal/models"
	"birdie-and-claire/internal/repository"

	"github.com/google/uuid"
)

type ProductImageService interface {
	ListByProductID(ctx context.Context, productID uuid.UUID) ([]models.ProductImageResponse, error)
}

type productImageService struct {
	repo *repository.Repository
}

func NewProductImageService(repo *repository.Repository) ProductImageService {
	return &productImageService{repo: repo}
}

func (s *productImageService) ListByProductID(ctx context.Context, productID uuid.UUID) ([]models.ProductImageResponse, error) {
	exists, err := s.repo.Product.Exists(ctx, productID)
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
	log.Debug(ctx, "listed product images", "product_id", productID, "count", len(images))

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
