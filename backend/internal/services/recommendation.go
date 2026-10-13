package services

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"birdie-and-claire/internal/embedder"
	"birdie-and-claire/internal/errs"
	"birdie-and-claire/internal/llm"
	"birdie-and-claire/internal/models"
	"birdie-and-claire/internal/repository"

	"golang.org/x/sync/errgroup"
)

const (
	recommendationsPerSlot = 10
	// the llm client sets no timeout of its own, so a hung gateway would hold the request open
	expandQueryTimeout = 30 * time.Second
)

type RecommendationService interface {
	Recommend(ctx context.Context, query string) (models.RecommendationResponse, error)
}

type recommendationService struct {
	repo     *repository.Repository
	llm      llm.Client
	embedder embedder.Embedder
}

func NewRecommendationService(repo *repository.Repository, llmClient llm.Client, emb embedder.Embedder) RecommendationService {
	return &recommendationService{repo: repo, llm: llmClient, embedder: emb}
}

func (s *recommendationService) Recommend(ctx context.Context, query string) (models.RecommendationResponse, error) {
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
		Top:       []models.Product{},
		Bottom:    []models.Product{},
		Accessory: []models.Product{},
	}
	slots := []struct {
		name     string
		phrase   string
		products *[]models.Product
	}{
		{name: "top", phrase: response.ExpandedQuery.Slots.Top, products: &response.Top},
		{name: "bottom", phrase: response.ExpandedQuery.Slots.Bottom, products: &response.Bottom},
		{name: "accessory", phrase: response.ExpandedQuery.Slots.Accessory, products: &response.Accessory},
	}
	excludeTags, niceTags := response.ExpandedQuery.ExcludeTags, response.ExpandedQuery.NiceTags

	group, groupCtx := errgroup.WithContext(ctx)
	for _, slot := range slots {
		// the embedder rejects blank text as invalid input, which would reach the shopper as a 400
		if slot.phrase == "" {
			continue
		}
		group.Go(func() error {
			embedding, err := s.embedder.EmbedText(groupCtx, slot.phrase)
			// a rejected phrase is the model's, not the shopper's, and Modal's detail can quote it
			if errors.Is(err, errs.ErrInvalidInput) {
				return fmt.Errorf("embed %s phrase: embedder rejected it", slot.name)
			}
			if err != nil {
				return fmt.Errorf("embed %s phrase: %w", slot.name, err)
			}
			products, err := s.repo.Product.FindSimilar(groupCtx, embedding, slot.name, excludeTags, niceTags, recommendationsPerSlot)
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

// FindSimilar lowercases the stored tags, and a nil result would serialize as null, which the response schema does not allow
func lowercaseTags(tags []string) []string {
	lowered := make([]string, 0, len(tags))
	for _, tag := range tags {
		lowered = append(lowered, strings.ToLower(tag))
	}
	return lowered
}
