package controllers

import (
	"context"
	"fmt"

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

// List returns a page of the products the authenticated user owns, most recently added first.
func (c *OwnedProductController) List(ctx context.Context, input *ListOwnedProductsInput) (*ListOwnedProductsOutput, error) {
	page, err := c.service.List(ctx, input.CursorParams)
	if err != nil {
		return nil, errs.ToHuma(ctx, err)
	}
	return &ListOwnedProductsOutput{Body: page}, nil
}

// Matches the maxItems tag below, which can't name a constant.
const maxProductIDsPerAdd = 50

type AddOwnedProductsInput struct {
	Body struct {
		ProductIDs []uuid.UUID `json:"product_ids" required:"true" nullable:"false" minItems:"1" maxItems:"50" doc:"Catalog products the user owns; ones already owned are skipped"`
	}
}

var _ huma.Resolver = (*AddOwnedProductsInput)(nil)

func (input *AddOwnedProductsInput) Resolve(huma.Context) []error {
	// Huma validates one copy of a key repeated in different casing but Go keeps the last, so a list can get past minItems and maxItems.
	if len(input.Body.ProductIDs) == 0 {
		return []error{&huma.ErrorDetail{Location: "body.product_ids", Message: "product_ids must not be empty"}}
	}
	if len(input.Body.ProductIDs) > maxProductIDsPerAdd {
		return []error{&huma.ErrorDetail{Location: "body.product_ids", Message: fmt.Sprintf("product_ids must have at most %d items", maxProductIDsPerAdd)}}
	}
	if err := checkDuplicateProductIDs(input.Body.ProductIDs); err != nil {
		return []error{err}
	}
	return nil
}

// Add records catalog products as owned by the authenticated user.
func (c *OwnedProductController) Add(ctx context.Context, input *AddOwnedProductsInput) (*struct{}, error) {
	if err := c.service.Add(ctx, input.Body.ProductIDs); err != nil {
		return nil, errs.ToHuma(ctx, err)
	}
	return nil, nil
}

type OwnedProductIDInput struct {
	ProductID uuid.UUID `path:"product_id" doc:"Catalog product ID"`
}

// Remove drops one product from the ones the authenticated user owns.
func (c *OwnedProductController) Remove(ctx context.Context, input *OwnedProductIDInput) (*struct{}, error) {
	if err := c.service.Remove(ctx, input.ProductID); err != nil {
		return nil, errs.ToHuma(ctx, err)
	}
	return nil, nil
}
