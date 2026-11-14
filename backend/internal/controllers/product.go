package controllers

import (
	"context"

	"birdie-and-claire/internal/errs"
	"birdie-and-claire/internal/models"
	"birdie-and-claire/internal/services"
	"birdie-and-claire/internal/utils/pagination"
)

type ProductController struct {
	service services.ProductService
}

func NewProductController(service services.ProductService) *ProductController {
	return &ProductController{service: service}
}

type ListUnownedProductsInput struct {
	pagination.CursorParams
}

type ListUnownedProductsOutput struct {
	Body pagination.Page[models.ProductResponse]
}

func (c *ProductController) ListUnownedProducts(ctx context.Context, input *ListUnownedProductsInput) (*ListUnownedProductsOutput, error) {
	page, err := c.service.ListUnownedProducts(ctx, input.CursorParams)
	if err != nil {
		return nil, errs.ToHuma(ctx, err)
	}
	return &ListUnownedProductsOutput{Body: page}, nil
}

type ListBirdieAndClaireProductsInput struct {
	pagination.CursorParams
	Category models.ProductCategory `query:"category" required:"true" enum:"tops,sweaters,bottoms,jumpsuits,accessories" doc:"The Add Items tab to list. Shoes have no tab."`
}

type ListBirdieAndClaireProductsOutput struct {
	Body pagination.Page[models.BirdieAndClaireProductResponse]
}

func (c *ProductController) ListBirdieAndClaireProducts(ctx context.Context, input *ListBirdieAndClaireProductsInput) (*ListBirdieAndClaireProductsOutput, error) {
	page, err := c.service.ListBirdieAndClaireProducts(ctx, input.Category, input.CursorParams)
	if err != nil {
		return nil, errs.ToHuma(ctx, err)
	}
	return &ListBirdieAndClaireProductsOutput{Body: page}, nil
}
