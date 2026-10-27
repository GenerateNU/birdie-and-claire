package controllers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"birdie-and-claire/internal/errs"
	"birdie-and-claire/internal/models"
	"birdie-and-claire/internal/services"
	"birdie-and-claire/internal/utils/pagination"

	"github.com/danielgtaylor/huma/v2"
	"github.com/google/uuid"
)

type OutfitController struct {
	service services.OutfitService
}

func NewOutfitController(service services.OutfitService) *OutfitController {
	return &OutfitController{service: service}
}

type CreateOutfitInput struct {
	Body struct {
		Name       string      `json:"name" required:"true" minLength:"1" maxLength:"100" doc:"Display name for the outfit"`
		ProductIDs []uuid.UUID `json:"product_ids" required:"true" nullable:"false" minItems:"1" doc:"IDs of the products in the outfit"`
	}
}

var _ huma.Resolver = (*CreateOutfitInput)(nil)

// Resolve compares parsed UUIDs, so differently cased spellings of one ID still count as duplicates.
func (input *CreateOutfitInput) Resolve(huma.Context) []error {
	seen := make(map[uuid.UUID]bool, len(input.Body.ProductIDs))
	for _, id := range input.Body.ProductIDs {
		if seen[id] {
			return []error{huma.Error400BadRequest("duplicate product id")}
		}
		seen[id] = true
	}
	return nil
}

type OutfitOutput struct {
	Body models.OutfitResponse
}

// Create saves an outfit for the authenticated user and returns it with its products.
func (c *OutfitController) Create(ctx context.Context, input *CreateOutfitInput) (*OutfitOutput, error) {
	outfit, err := c.service.Create(ctx, models.CreateOutfitParams{
		Name:       input.Body.Name,
		ProductIDs: input.Body.ProductIDs,
	})
	if err != nil {
		return nil, errs.ToHuma(ctx, err)
	}
	return &OutfitOutput{Body: outfit}, nil
}

type OutfitIDInput struct {
	ID uuid.UUID `path:"id" doc:"Outfit ID"`
}

// Get returns one of the authenticated user's outfits with its products.
func (c *OutfitController) Get(ctx context.Context, input *OutfitIDInput) (*OutfitOutput, error) {
	outfit, err := c.service.Get(ctx, input.ID)
	if err != nil {
		return nil, errs.ToHuma(ctx, err)
	}
	return &OutfitOutput{Body: outfit}, nil
}

// UpdateOutfitBody records which fields arrived as null, because huma skips validating a null optional field.
type UpdateOutfitBody struct {
	Name           *string     `json:"name,omitempty" minLength:"1" maxLength:"100" doc:"New display name for the outfit"`
	ProductIDs     []uuid.UUID `json:"product_ids,omitempty" nullable:"false" minItems:"1" doc:"IDs of every product in the outfit; replaces the current set"`
	nameNull       bool
	productIDsNull bool
}

func (body *UpdateOutfitBody) UnmarshalJSON(data []byte) error {
	// The alias has no UnmarshalJSON method, so decoding into it does not recurse.
	type updateOutfitFields UpdateOutfitBody
	if err := json.Unmarshal(data, (*updateOutfitFields)(body)); err != nil {
		return fmt.Errorf("decode update outfit body: %w", err)
	}

	var fields map[string]json.RawMessage
	if err := json.Unmarshal(data, &fields); err != nil {
		return fmt.Errorf("decode update outfit body keys: %w", err)
	}
	// Case-insensitive, like Go's and huma's own key matching, so {"NAME": null} counts too.
	nameKeys, productIDsKeys := 0, 0
	nameNull, productIDsNull := false, false
	for key, value := range fields {
		isNull := string(value) == "null"
		if strings.EqualFold(key, "name") {
			nameKeys++
			nameNull = nameNull || isNull
		}
		if strings.EqualFold(key, "product_ids") {
			productIDsKeys++
			productIDsNull = productIDsNull || isNull
		}
	}
	// Huma reports these at location "body", so the message names the field.
	// Huma validates one copy of a field repeated in different casing but Go keeps the last, so reject it.
	if nameKeys > 1 {
		return errors.New("name must not be repeated in different casing")
	}
	if productIDsKeys > 1 {
		return errors.New("product_ids must not be repeated in different casing")
	}
	body.nameNull = nameNull
	body.productIDsNull = productIDsNull
	return nil
}

// UpdateOutfitInput keeps any field the client leaves out of the body.
type UpdateOutfitInput struct {
	OutfitIDInput
	Body UpdateOutfitBody
}

var _ huma.Resolver = (*UpdateOutfitInput)(nil)

func (input *UpdateOutfitInput) Resolve(huma.Context) []error {
	if input.Body.nameNull {
		return []error{&huma.ErrorDetail{Location: "body.name", Message: "name must not be null"}}
	}
	if input.Body.productIDsNull {
		return []error{&huma.ErrorDetail{Location: "body.product_ids", Message: "product_ids must not be null"}}
	}
	if input.Body.Name == nil && input.Body.ProductIDs == nil {
		return []error{&huma.ErrorDetail{Location: "body", Message: "body must set name or product_ids"}}
	}
	seen := make(map[uuid.UUID]bool, len(input.Body.ProductIDs))
	for _, id := range input.Body.ProductIDs {
		if seen[id] {
			return []error{huma.Error400BadRequest("duplicate product id")}
		}
		seen[id] = true
	}
	return nil
}

// Update renames one of the authenticated user's outfits, replaces its products, or both.
func (c *OutfitController) Update(ctx context.Context, input *UpdateOutfitInput) (*OutfitOutput, error) {
	outfit, err := c.service.Update(ctx, input.ID, models.UpdateOutfitParams{
		Name:       input.Body.Name,
		ProductIDs: input.Body.ProductIDs,
	})
	if err != nil {
		return nil, errs.ToHuma(ctx, err)
	}
	return &OutfitOutput{Body: outfit}, nil
}

type ShareOutfitOutput struct {
	Body models.ShareOutfitResponse
}

// Share makes one of the authenticated user's outfits public and returns its link.
func (c *OutfitController) Share(ctx context.Context, input *OutfitIDInput) (*ShareOutfitOutput, error) {
	share, err := c.service.Share(ctx, input.ID)
	if err != nil {
		return nil, errs.ToHuma(ctx, err)
	}
	return &ShareOutfitOutput{Body: share}, nil
}

// Unshare makes one of the authenticated user's outfits private again.
func (c *OutfitController) Unshare(ctx context.Context, input *OutfitIDInput) (*struct{}, error) {
	if err := c.service.Unshare(ctx, input.ID); err != nil {
		return nil, errs.ToHuma(ctx, err)
	}
	return nil, nil
}

type SharedOutfitOutput struct {
	Body models.SharedOutfitResponse
}

// GetShared returns a shared outfit to anyone, signed in or not.
func (c *OutfitController) GetShared(ctx context.Context, input *OutfitIDInput) (*SharedOutfitOutput, error) {
	outfit, err := c.service.GetShared(ctx, input.ID)
	if err != nil {
		return nil, errs.ToHuma(ctx, err)
	}
	return &SharedOutfitOutput{Body: outfit}, nil
}

type ListOutfitsInput struct {
	pagination.CursorParams
}

type ListOutfitsOutput struct {
	Body pagination.Page[models.Outfit]
}

// List returns a page of the authenticated user's outfits, newest first.
func (c *OutfitController) List(ctx context.Context, input *ListOutfitsInput) (*ListOutfitsOutput, error) {
	page, err := c.service.List(ctx, input.CursorParams)
	if err != nil {
		return nil, errs.ToHuma(ctx, err)
	}
	return &ListOutfitsOutput{Body: page}, nil
}
