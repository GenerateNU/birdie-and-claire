package controllers

import (
	"context"
	"slices"

	"birdie-and-claire/internal/errs"
	"birdie-and-claire/internal/models"
	"birdie-and-claire/internal/services"
	"birdie-and-claire/internal/utils/pagination"

	"github.com/danielgtaylor/huma/v2"
	"github.com/google/uuid"
)

type OwnedProductController struct {
	service services.OwnedProductService
}

func NewOwnedProductController(service services.OwnedProductService) *OwnedProductController {
	return &OwnedProductController{service: service}
}

type ListOwnedProductsInput struct {
	pagination.CursorParams
}

type ListOwnedProductsOutput struct {
	Body pagination.Page[models.OwnedProductResponse]
}

func (c *OwnedProductController) ListOwnedProducts(ctx context.Context, input *ListOwnedProductsInput) (*ListOwnedProductsOutput, error) {
	page, err := c.service.ListOwnedProducts(ctx, input.CursorParams)
	if err != nil {
		return nil, errs.ToHuma(ctx, err)
	}
	return &ListOwnedProductsOutput{Body: page}, nil
}

type AddOwnedProductsInput struct {
	Body struct {
		ProductIDs []uuid.UUID `json:"product_ids" required:"true" nullable:"false" minItems:"1" maxItems:"50" doc:"Catalog products the user owns; ones already owned are skipped"`
	}
}

var _ huma.Resolver = (*AddOwnedProductsInput)(nil)

func (input *AddOwnedProductsInput) Resolve(huma.Context) []error {
	if err := checkDuplicateProductIDs(input.Body.ProductIDs); err != nil {
		return []error{err}
	}
	return nil
}

func (c *OwnedProductController) AddOwnedProducts(ctx context.Context, input *AddOwnedProductsInput) (*struct{}, error) {
	if err := c.service.AddOwnedProducts(ctx, input.Body.ProductIDs); err != nil {
		return nil, errs.ToHuma(ctx, err)
	}
	return nil, nil
}

type UpdateOwnedProductsInput struct {
	Body struct {
		AddProductIDs    []uuid.UUID `json:"add_product_ids" required:"true" nullable:"false" maxItems:"50" doc:"Catalog products to add; ones already owned are skipped"`
		RemoveProductIDs []uuid.UUID `json:"remove_product_ids" required:"true" nullable:"false" maxItems:"50" doc:"Products to remove; ones not owned are skipped"`
	}
}

var _ huma.Resolver = (*UpdateOwnedProductsInput)(nil)

// Resolve rejects an empty change and a product listed twice, including once in each list.
func (input *UpdateOwnedProductsInput) Resolve(huma.Context) []error {
	if len(input.Body.AddProductIDs) == 0 && len(input.Body.RemoveProductIDs) == 0 {
		return []error{huma.Error400BadRequest("nothing to add or remove")}
	}
	if err := checkDuplicateProductIDs(append(slices.Clone(input.Body.AddProductIDs), input.Body.RemoveProductIDs...)); err != nil {
		return []error{err}
	}
	return nil
}

func (c *OwnedProductController) UpdateOwnedProducts(ctx context.Context, input *UpdateOwnedProductsInput) (*struct{}, error) {
	if err := c.service.UpdateOwnedProducts(ctx, input.Body.AddProductIDs, input.Body.RemoveProductIDs); err != nil {
		return nil, errs.ToHuma(ctx, err)
	}
	return nil, nil
}

type OwnedProductIDInput struct {
	ProductID uuid.UUID `path:"product_id" doc:"Catalog product ID"`
}

func (c *OwnedProductController) RemoveOwnedProduct(ctx context.Context, input *OwnedProductIDInput) (*struct{}, error) {
	if err := c.service.RemoveOwnedProduct(ctx, input.ProductID); err != nil {
		return nil, errs.ToHuma(ctx, err)
	}
	return nil, nil
}
