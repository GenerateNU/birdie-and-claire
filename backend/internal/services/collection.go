package services

import (
	"context"

	"birdie-and-claire/internal/auth"
	"birdie-and-claire/internal/models"
	"birdie-and-claire/internal/repository"
	"birdie-and-claire/internal/utils/pagination"

	"github.com/google/uuid"
)

// CollectionService keeps the authenticated user's collections of outfits. A collection that is missing or belongs
// to someone else fails with errs.ErrNotFound.
type CollectionService interface {
	Create(ctx context.Context, params models.CreateCollectionParams) (models.CollectionSummaryResponse, error)
	ListUserCollections(ctx context.Context, params pagination.CursorParams) (pagination.Page[models.CollectionSummaryResponse], error)
	Get(ctx context.Context, id uuid.UUID) (models.Collection, error)
	ListCollectionOutfits(ctx context.Context, id uuid.UUID, params pagination.CursorParams) (pagination.Page[models.OutfitResponse], error)
	Update(ctx context.Context, id uuid.UUID, params models.UpdateCollectionParams) (models.Collection, error)
	Delete(ctx context.Context, id uuid.UUID) error
}

type collectionService struct {
	repo *repository.Repository
}

func NewCollectionService(repo *repository.Repository) CollectionService {
	return &collectionService{repo: repo}
}

func (s *collectionService) Create(ctx context.Context, params models.CreateCollectionParams) (models.CollectionSummaryResponse, error) {
	return s.repo.Collection.Create(ctx, params, auth.UserID(ctx))
}

func (s *collectionService) ListUserCollections(ctx context.Context, params pagination.CursorParams) (pagination.Page[models.CollectionSummaryResponse], error) {
	rows, err := s.repo.Collection.ListByUser(ctx, auth.UserID(ctx), params)
	if err != nil {
		return pagination.Page[models.CollectionSummaryResponse]{}, err
	}

	collections, hasMore := pagination.Split(rows, params.Limit)
	page := pagination.Page[models.CollectionSummaryResponse]{Items: collections, HasMore: hasMore}
	if !hasMore {
		return page, nil
	}

	last := collections[len(collections)-1]
	nextCursor, err := pagination.CursorFields{"created_at": last.CreatedAt, "id": last.ID}.Encode()
	if err != nil {
		return pagination.Page[models.CollectionSummaryResponse]{}, err
	}
	page.NextCursor = &nextCursor
	return page, nil
}

func (s *collectionService) Get(ctx context.Context, id uuid.UUID) (models.Collection, error) {
	return s.repo.Collection.GetByID(ctx, id, auth.UserID(ctx))
}

// ListCollectionOutfits returns a page of the collection's outfits, newest added first.
func (s *collectionService) ListCollectionOutfits(ctx context.Context, id uuid.UUID, params pagination.CursorParams) (pagination.Page[models.OutfitResponse], error) {
	if _, err := s.repo.Collection.GetByID(ctx, id, auth.UserID(ctx)); err != nil {
		return pagination.Page[models.OutfitResponse]{}, err
	}
	rows, err := s.repo.Collection.ListOutfitLinks(ctx, id, params)
	if err != nil {
		return pagination.Page[models.OutfitResponse]{}, err
	}

	links, hasMore := pagination.Split(rows, params.Limit)
	outfitIDs := make([]uuid.UUID, 0, len(links))
	for _, link := range links {
		outfitIDs = append(outfitIDs, link.OutfitID)
	}
	outfits, err := s.repo.Outfit.ListByIDs(ctx, outfitIDs)
	if err != nil {
		return pagination.Page[models.OutfitResponse]{}, err
	}

	page := pagination.Page[models.OutfitResponse]{Items: outfits, HasMore: hasMore}
	if !hasMore {
		return page, nil
	}

	// The cursor comes from the last link, not the last outfit, so an outfit deleted between the two reads cannot
	// move the page boundary.
	last := links[len(links)-1]
	nextCursor, err := pagination.CursorFields{"added_at": last.AddedAt, "outfit_id": last.OutfitID}.Encode()
	if err != nil {
		return pagination.Page[models.OutfitResponse]{}, err
	}
	page.NextCursor = &nextCursor
	return page, nil
}

func (s *collectionService) Update(ctx context.Context, id uuid.UUID, params models.UpdateCollectionParams) (models.Collection, error) {
	return s.repo.Collection.Update(ctx, id, params, auth.UserID(ctx))
}

func (s *collectionService) Delete(ctx context.Context, id uuid.UUID) error {
	return s.repo.Collection.Delete(ctx, id, auth.UserID(ctx))
}
