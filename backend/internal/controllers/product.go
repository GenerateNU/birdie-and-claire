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
