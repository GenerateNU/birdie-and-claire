package controllers

import (
	"context"

	"birdie-and-claire/internal/errs"
	"birdie-and-claire/internal/models"
	"birdie-and-claire/internal/services"

	"github.com/google/uuid"
)

type ProductImageController struct {
	service services.ProductImageService
}

func NewProductImageController(service services.ProductImageService) *ProductImageController {
	return &ProductImageController{service: service}
}

type ListProductImagesInput struct {
	ProductID uuid.UUID `path:"product_id" doc:"Product ID"`
}

type ListProductImagesOutput struct {
	Body []models.ProductImageResponse
}

// List returns a product's images ordered by position.
func (c *ProductImageController) List(ctx context.Context, input *ListProductImagesInput) (*ListProductImagesOutput, error) {
	images, err := c.service.ListByProductID(ctx, input.ProductID)
	if err != nil {
		return nil, errs.ToHuma(err)
	}
	return &ListProductImagesOutput{Body: images}, nil
}
