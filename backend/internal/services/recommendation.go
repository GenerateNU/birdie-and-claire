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
	// outfit n takes every slot's nth product, so this is also the most outfits a request returns
	productsPerSlot = 3
	// the prompt states both limits, so a longer answer means the model ignored them
	maxTagsPerList  = 10
	maxPhraseLength = 100
	// the llm client sets no timeout of its own, so a hung gateway would hold the request open
	expandAnswersTimeout = 30 * time.Second
)

type slotSearch struct {
	name     models.ProductSlot
	phrase   string
	products *[]models.ProductResponse
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

	expandCtx, cancel := context.WithTimeout(ctx, expandAnswersTimeout)
	rawExpandedAnswers, err := llm.ExpandAnswers(expandCtx, s.llm, answers)
	cancel()
	if err != nil {
		return models.RecommendationResponse{}, fmt.Errorf("expand shopper answers: %w", err)
	}

	expandedAnswers := models.RecommendationExpandedAnswers{
		Slots: models.RecommendationExpandedSlots{
			Top:       strings.TrimSpace(rawExpandedAnswers.Slots.Top),
			Bottom:    strings.TrimSpace(rawExpandedAnswers.Slots.Bottom),
			Accessory: strings.TrimSpace(rawExpandedAnswers.Slots.Accessory),
			Shoe:      strings.TrimSpace(rawExpandedAnswers.Slots.Shoe),
		},
		ExcludeTags: lowercaseTags(rawExpandedAnswers.ExcludeTags),
		NiceTags:    lowercaseTags(rawExpandedAnswers.NiceTags),
	}
	var tops, bottoms, accessories, shoes []models.ProductResponse
	slots := []slotSearch{
		{name: models.SlotTop, phrase: expandedAnswers.Slots.Top, products: &tops},
		{name: models.SlotBottom, phrase: expandedAnswers.Slots.Bottom, products: &bottoms},
		{name: models.SlotAccessory, phrase: expandedAnswers.Slots.Accessory, products: &accessories},
		{name: models.SlotShoe, phrase: expandedAnswers.Slots.Shoe, products: &shoes},
	}
	if err := checkExpansionLimits(slots, expandedAnswers); err != nil {
		return models.RecommendationResponse{}, err
	}

	group, groupCtx := errgroup.WithContext(ctx)
	for _, slot := range slots {
		group.Go(func() error {
			products, err := s.searchSlot(groupCtx, slot.name, slot.phrase, expandedAnswers.ExcludeTags, expandedAnswers.NiceTags)
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
	return models.RecommendationResponse{ExpandedAnswers: expandedAnswers, Outfits: outfits}, nil
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
	return s.repo.Product.FindSimilar(ctx, embedding, slot, excludeTags, niceTags, nil, productsPerSlot)
}

// the errors give sizes only, since the phrases and tags are the model's reading of shopper text
func checkExpansionLimits(slots []slotSearch, expandedAnswers models.RecommendationExpandedAnswers) error {
	if len(expandedAnswers.ExcludeTags) > maxTagsPerList || len(expandedAnswers.NiceTags) > maxTagsPerList {
		return fmt.Errorf("expanded answers have %d exclude and %d nice tags, more than %d per list",
			len(expandedAnswers.ExcludeTags), len(expandedAnswers.NiceTags), maxTagsPerList)
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
