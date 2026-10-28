package services

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"
	"unicode/utf8"

	"birdie-and-claire/internal/embedder"
	"birdie-and-claire/internal/errs"
	"birdie-and-claire/internal/llm"
	"birdie-and-claire/internal/models"
	"birdie-and-claire/internal/repository"

	"golang.org/x/sync/errgroup"
)

const (
	outfitsPerRequest = 3
	// the prompt states both limits, so a longer answer means the model ignored them
	maxTagsPerList  = 10
	maxPhraseLength = 100
	// the llm client sets no timeout of its own, so a hung gateway would hold the request open
	expandQueryTimeout = 30 * time.Second
)

type slotSearch struct {
	name     models.ProductSlot
	phrase   string
	products *[]models.RecommendedProduct
}

type RecommendationService interface {
	RecommendProducts(ctx context.Context, request models.RecommendationRequest) (models.RecommendationResponse, error)
}

type recommendationService struct {
	repo     *repository.Repository
	llm      llm.Client
	embedder embedder.Embedder
}

func NewRecommendationService(repo *repository.Repository, llmClient llm.Client, emb embedder.Embedder) RecommendationService {
	return &recommendationService{repo: repo, llm: llmClient, embedder: emb}
}

func (s *recommendationService) RecommendProducts(ctx context.Context, request models.RecommendationRequest) (models.RecommendationResponse, error) {
	answers := map[string]string{models.OccasionPromptLabel: request.Occasion}
	for _, detail := range request.Details {
		answers[models.DetailPromptLabels[detail.Key]] = detail.Value
	}

	expandCtx, cancel := context.WithTimeout(ctx, expandQueryTimeout)
	expanded, err := llm.ExpandQuery(expandCtx, s.llm, answers)
	cancel()
	if err != nil {
		return models.RecommendationResponse{}, fmt.Errorf("expand recommendation query: %w", err)
	}

	expandedQuery := models.RecommendationExpandedQuery{
		Slots: models.RecommendationExpandedSlots{
			Top:       strings.TrimSpace(expanded.Slots.Top),
			Bottom:    strings.TrimSpace(expanded.Slots.Bottom),
			Accessory: strings.TrimSpace(expanded.Slots.Accessory),
			Shoe:      strings.TrimSpace(expanded.Slots.Shoe),
		},
		ExcludeTags: lowercaseTags(expanded.ExcludeTags),
		NiceTags:    lowercaseTags(expanded.NiceTags),
	}
	var tops, bottoms, accessories, shoes []models.RecommendedProduct
	slots := []slotSearch{
		{name: models.SlotTop, phrase: expandedQuery.Slots.Top, products: &tops},
		{name: models.SlotBottom, phrase: expandedQuery.Slots.Bottom, products: &bottoms},
		{name: models.SlotAccessory, phrase: expandedQuery.Slots.Accessory, products: &accessories},
		{name: models.SlotShoe, phrase: expandedQuery.Slots.Shoe, products: &shoes},
	}
	if err := checkExpansionLimits(slots, expandedQuery); err != nil {
		return models.RecommendationResponse{}, err
	}

	group, groupCtx := errgroup.WithContext(ctx)
	for _, slot := range slots {
		group.Go(func() error {
			products, err := s.searchSlot(groupCtx, slot.name, slot.phrase, expandedQuery.ExcludeTags, expandedQuery.NiceTags)
			if err != nil {
				return err
			}
			*slot.products = products
			return nil
		})
	}
	if err := group.Wait(); err != nil {
		return models.RecommendationResponse{}, err
	}

	outfitCount := min(len(tops), len(bottoms), len(accessories), len(shoes))
	// non-nil, since a null list would break the response schema
	outfits := make([]models.RecommendedOutfit, 0, outfitCount)
	for rank := range outfitCount {
		outfits = append(outfits, models.RecommendedOutfit{
			Top:       tops[rank],
			Bottom:    bottoms[rank],
			Accessory: accessories[rank],
			Shoe:      shoes[rank],
		})
	}
	return models.RecommendationResponse{ExpandedQuery: expandedQuery, Outfits: outfits}, nil
}

func (s *recommendationService) searchSlot(ctx context.Context, slot models.ProductSlot, phrase string, excludeTags, niceTags []string) ([]models.RecommendedProduct, error) {
	embedding, err := s.embedder.EmbedText(ctx, phrase)
	// a rejected phrase is the model's, not the shopper's, and Modal's detail can quote it
	if errors.Is(err, errs.ErrInvalidInput) {
		return nil, fmt.Errorf("embed %s phrase: embedder rejected it", slot)
	}
	if err != nil {
		return nil, fmt.Errorf("embed %s phrase: %w", slot, err)
	}
	return s.repo.Product.FindSimilar(ctx, embedding, slot, excludeTags, niceTags, outfitsPerRequest)
}

// the errors give sizes only, since the phrases and tags are the model's reading of shopper text
func checkExpansionLimits(slots []slotSearch, expanded models.RecommendationExpandedQuery) error {
	if len(expanded.ExcludeTags) > maxTagsPerList || len(expanded.NiceTags) > maxTagsPerList {
		return fmt.Errorf("expanded query has %d exclude and %d nice tags, more than %d per list",
			len(expanded.ExcludeTags), len(expanded.NiceTags), maxTagsPerList)
	}
	for _, slot := range slots {
		if length := utf8.RuneCountInString(slot.phrase); length > maxPhraseLength {
			return fmt.Errorf("expanded %s phrase is %d characters, more than %d", slot.name, length, maxPhraseLength)
		}
	}
	return nil
}

// FindSimilar lowercases the stored tags, and a nil result would serialize as null, which the response schema does not allow
func lowercaseTags(tags []string) []string {
	lowered := make([]string, 0, len(tags))
	for _, tag := range tags {
		lowered = append(lowered, strings.ToLower(tag))
	}
	return lowered
}
