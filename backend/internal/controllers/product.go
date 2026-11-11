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

type ListProductsInput struct {
	pagination.CursorParams
}

type ListProductsOutput struct {
	Body pagination.Page[models.ProductResponse]
}

// List returns a page of the catalog, newest first, without the products the authenticated user owns.
func (c *ProductController) List(ctx context.Context, input *ListProductsInput) (*ListProductsOutput, error) {
	page, err := c.service.List(ctx, input.CursorParams)
	if err != nil {
		return nil, errs.ToHuma(ctx, err)
	}
	return &ListProductsOutput{Body: page}, nil
}
