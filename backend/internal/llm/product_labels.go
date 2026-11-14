package llm

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"strings"

	"birdie-and-claire/internal/models"
)

const labelProductAttempts = 2

// ProductLabelInput is a store product as the labeling prompt sees it. The text comes from Shopify, and LabelProduct
// treats it as untrusted.
type ProductLabelInput struct {
	Slot        models.ProductSlot `json:"slot"`
	Title       string             `json:"title"`
	Description string             `json:"description"`
	Tags        []string           `json:"tags"`
	// "name: value" lines from the store's options and metafields, such as "fabric: 72% EcoViscose; 28% PBT"
	StoreDetails []string `json:"store_details"`
	ImageURLs    []string `json:"image_urls"`
}

type labelProductInput struct {
	Product    labeledProduct  `json:"product"`
	Slot       string          `json:"slot"`
	Vocabulary labelVocabulary `json:"vocabulary"`
	ImageURLs  []string        `json:"image_urls"`
}

type labeledProduct struct {
	Title        string   `json:"title"`
	Description  string   `json:"description"`
	Tags         []string `json:"tags"`
	StoreDetails []string `json:"store_details"`
}

// productLabels is the model's answer. The schema leaves the lists open so one stray value is dropped instead of
// failing the whole answer, and an empty type means the product is not in that type's slot.
type productLabels struct {
	ProductTarget string             `json:"product_target"`
	NecklineType  string             `json:"neckline_type"`
	BottomType    string             `json:"bottom_type"`
	ShoeType      string             `json:"shoe_type"`
	Tags          models.ProductTags `json:"tags"`
	Details       []string           `json:"details"`
	StyleNote     string             `json:"style_note"`
}

type labelVocabulary struct {
	ProductTarget []string           `json:"product_target"`
	NecklineType  []string           `json:"neckline_type"`
	BottomType    []string           `json:"bottom_type"`
	ShoeType      []string           `json:"shoe_type"`
	Tags          models.ProductTags `json:"tags"`
}

// LabelProduct reads a product's photos and store data into attributes. Every fixed-list value in a nil-error result
// is on its list, and only the type for input.Slot can be set.
func LabelProduct(ctx context.Context, client Client, input ProductLabelInput) (models.ProductAttributes, error) {
	req := Request{
		promptName: "label_product",
		promptInput: labelProductInput{
			Product: labeledProduct{
				Title:        stripDotpromptMarkers(input.Title),
				Description:  stripDotpromptMarkers(input.Description),
				Tags:         stripEachDotpromptMarkers(input.Tags),
				StoreDetails: stripEachDotpromptMarkers(input.StoreDetails),
			},
			Slot: string(input.Slot),
			Vocabulary: labelVocabulary{
				ProductTarget: models.ProductTargets,
				NecklineType:  models.NecklineTypes,
				BottomType:    models.BottomTypes,
				ShoeType:      models.ShoeTypes,
				Tags:          models.ProductTagValues,
			},
			ImageURLs: stripEachDotpromptMarkers(input.ImageURLs),
		},
	}
	var err error
	for range labelProductAttempts {
		var labels productLabels
		labels, err = Generate[productLabels](ctx, client, req)
		var attributes models.ProductAttributes
		if err == nil {
			attributes, err = toProductAttributes(labels, input.Slot)
		}
		// the client already retries transport errors, 429 and 5xx, so only a bad answer is retried here
		if !errors.Is(err, ErrInvalidOutput) {
			return attributes, err
		}
	}
	return models.ProductAttributes{}, err
}

// toProductAttributes drops every value outside its list. A product target is the one value every product needs, so a
// missing one fails the answer.
func toProductAttributes(labels productLabels, slot models.ProductSlot) (models.ProductAttributes, error) {
	target := normalizeLabel(labels.ProductTarget)
	if !slices.Contains(models.ProductTargets, target) {
		return models.ProductAttributes{}, fmt.Errorf("%w: product target is not on its list", ErrInvalidOutput)
	}

	attributes := models.ProductAttributes{
		ProductTarget: target,
		Tags: models.ProductTags{
			Colors:    keepListed(labels.Tags.Colors, models.ProductTagValues.Colors),
			Formality: keepListed(labels.Tags.Formality, models.ProductTagValues.Formality),
			Occasions: keepListed(labels.Tags.Occasions, models.ProductTagValues.Occasions),
			Season:    keepListed(labels.Tags.Season, models.ProductTagValues.Season),
			Pattern:   keepListed(labels.Tags.Pattern, models.ProductTagValues.Pattern),
			Fabric:    keepListed(labels.Tags.Fabric, models.ProductTagValues.Fabric),
			Fit:       keepListed(labels.Tags.Fit, models.ProductTagValues.Fit),
		},
		Details:   keepNonBlank(labels.Details),
		StyleNote: strings.TrimSpace(labels.StyleNote),
	}
	switch slot {
	case models.SlotTop:
		attributes.NecklineType = listedOrNil(labels.NecklineType, models.NecklineTypes)
	case models.SlotBottom:
		attributes.BottomType = listedOrNil(labels.BottomType, models.BottomTypes)
	case models.SlotShoe:
		attributes.ShoeType = listedOrNil(labels.ShoeType, models.ShoeTypes)
	}
	return attributes, nil
}

func normalizeLabel(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

// keepListed never returns nil, so an empty list is stored as [] and not null
func keepListed(values, allowed []string) []string {
	kept := make([]string, 0, len(values))
	for _, value := range values {
		value = normalizeLabel(value)
		if slices.Contains(allowed, value) && !slices.Contains(kept, value) {
			kept = append(kept, value)
		}
	}
	return kept
}

func listedOrNil(value string, allowed []string) *string {
	value = normalizeLabel(value)
	if !slices.Contains(allowed, value) {
		return nil
	}
	return &value
}

func keepNonBlank(values []string) []string {
	kept := make([]string, 0, len(values))
	for _, value := range values {
		if value = strings.TrimSpace(value); value != "" {
			kept = append(kept, value)
		}
	}
	return kept
}

func stripEachDotpromptMarkers(values []string) []string {
	stripped := make([]string, len(values))
	for i, value := range values {
		stripped[i] = stripDotpromptMarkers(value)
	}
	return stripped
}
