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
	Slots []models.ProductSlot `query:"slot,explode" required:"true" nullable:"false" minItems:"1" doc:"Slots to list; repeat the parameter for more than one"`
	models.ProductTypeFilter
	OwnedOnly bool `query:"owned_only" doc:"Only products the authenticated user owns"`
}

type ListBirdieAndClaireProductsOutput struct {
	Body models.BirdieAndClaireProductPage
}

func (c *ProductController) ListBirdieAndClaireProducts(ctx context.Context, input *ListBirdieAndClaireProductsInput) (*ListBirdieAndClaireProductsOutput, error) {
	filter := models.BirdieAndClaireProductFilter{
		Slots:             input.Slots,
		ProductTypeFilter: input.ProductTypeFilter,
		OwnedOnly:         input.OwnedOnly,
	}
	page, err := c.service.ListBirdieAndClaireProducts(ctx, filter, input.CursorParams)
	if err != nil {
		return nil, errs.ToHuma(ctx, err)
	}
	return &ListBirdieAndClaireProductsOutput{Body: page}, nil
}
