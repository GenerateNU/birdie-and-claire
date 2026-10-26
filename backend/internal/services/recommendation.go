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
	recommendationsPerSlot = 10
	// the prompt states both limits, so a longer answer means the model ignored them
	maxTagsPerList  = 10
	maxPhraseLength = 100
	// the llm client sets no timeout of its own, so a hung gateway would hold the request open
	expandQueryTimeout = 30 * time.Second
)

type slotSearch struct {
	name     models.ProductSlot
	phrase   string
	products *[]models.ProductResponse
}

type RecommendationService interface {
	RecommendProducts(ctx context.Context, query string) (models.RecommendationResponse, error)
}

type recommendationService struct {
	repo     *repository.Repository
	llm      llm.Client
	embedder embedder.Embedder
}

func NewRecommendationService(repo *repository.Repository, llmClient llm.Client, emb embedder.Embedder) RecommendationService {
	return &recommendationService{repo: repo, llm: llmClient, embedder: emb}
}

func (s *recommendationService) RecommendProducts(ctx context.Context, query string) (models.RecommendationResponse, error) {
	expandCtx, cancel := context.WithTimeout(ctx, expandQueryTimeout)
	expanded, err := llm.ExpandQuery(expandCtx, s.llm, query)
	cancel()
	if err != nil {
		return models.RecommendationResponse{}, fmt.Errorf("expand recommendation query: %w", err)
	}

	response := models.RecommendationResponse{
		ExpandedQuery: models.RecommendationExpandedQuery{
			Slots: models.RecommendationExpandedSlots{
				Top:       strings.TrimSpace(expanded.Slots.Top),
				Bottom:    strings.TrimSpace(expanded.Slots.Bottom),
				Accessory: strings.TrimSpace(expanded.Slots.Accessory),
			},
			ExcludeTags: lowercaseTags(expanded.ExcludeTags),
			NiceTags:    lowercaseTags(expanded.NiceTags),
		},
		Top:       []models.ProductResponse{},
		Bottom:    []models.ProductResponse{},
		Accessory: []models.ProductResponse{},
	}
	slots := []slotSearch{
		{name: models.SlotTop, phrase: response.ExpandedQuery.Slots.Top, products: &response.Top},
		{name: models.SlotBottom, phrase: response.ExpandedQuery.Slots.Bottom, products: &response.Bottom},
		{name: models.SlotAccessory, phrase: response.ExpandedQuery.Slots.Accessory, products: &response.Accessory},
	}
	if err := checkExpansionLimits(slots, response.ExpandedQuery); err != nil {
		return models.RecommendationResponse{}, err
	}
	excludeTags, niceTags := response.ExpandedQuery.ExcludeTags, response.ExpandedQuery.NiceTags

	group, groupCtx := errgroup.WithContext(ctx)
	for _, slot := range slots {
		// the embedder rejects blank text as invalid input, which would reach the shopper as a 400
		if slot.phrase == "" {
			continue
		}
		group.Go(func() error {
			products, err := s.searchSlot(groupCtx, slot.name, slot.phrase, excludeTags, niceTags)
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
	return response, nil
}

func (s *recommendationService) searchSlot(ctx context.Context, slot models.ProductSlot, phrase string, excludeTags, niceTags []string) ([]models.ProductResponse, error) {
	embedding, err := s.embedder.EmbedText(ctx, phrase)
	// a rejected phrase is the model's, not the shopper's, and Modal's detail can quote it
	if errors.Is(err, errs.ErrInvalidInput) {
		return nil, fmt.Errorf("embed %s phrase: embedder rejected it", slot)
	}
	if err != nil {
		return nil, fmt.Errorf("embed %s phrase: %w", slot, err)
	}
	return s.repo.Product.FindSimilar(ctx, embedding, slot, excludeTags, niceTags, recommendationsPerSlot)
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
