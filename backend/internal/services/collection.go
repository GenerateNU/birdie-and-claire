package services

import (
	"context"

	"birdie-and-claire/internal/auth"
	"birdie-and-claire/internal/models"
	"birdie-and-claire/internal/repository"

	"github.com/google/uuid"
)

// CollectionService keeps the authenticated user's collections of outfits. A collection that is missing or belongs
// to someone else fails with errs.ErrNotFound.
type CollectionService interface {
	Create(ctx context.Context, params models.CreateCollectionParams) (models.CollectionResponse, error)
	List(ctx context.Context) (models.ListCollectionsResponse, error)
	Get(ctx context.Context, id uuid.UUID) (models.CollectionDetailResponse, error)
	Update(ctx context.Context, id uuid.UUID, params models.UpdateCollectionParams) (models.CollectionResponse, error)
	Delete(ctx context.Context, id uuid.UUID) error
}

type collectionService struct {
	repo *repository.Repository
}

func NewCollectionService(repo *repository.Repository) CollectionService {
	return &collectionService{repo: repo}
}

func (s *collectionService) Create(ctx context.Context, params models.CreateCollectionParams) (models.CollectionResponse, error) {
	return s.repo.Collection.Create(ctx, params, auth.UserID(ctx))
}

func (s *collectionService) List(ctx context.Context) (models.ListCollectionsResponse, error) {
	collections, err := s.repo.Collection.List(ctx, auth.UserID(ctx))
	if err != nil {
		return models.ListCollectionsResponse{}, err
	}
	return models.ListCollectionsResponse{Items: collections}, nil
}

func (s *collectionService) Get(ctx context.Context, id uuid.UUID) (models.CollectionDetailResponse, error) {
	return s.repo.Collection.GetByID(ctx, id, auth.UserID(ctx))
}

func (s *collectionService) Update(ctx context.Context, id uuid.UUID, params models.UpdateCollectionParams) (models.CollectionResponse, error) {
	return s.repo.Collection.Update(ctx, id, params, auth.UserID(ctx))
}

func (s *collectionService) Delete(ctx context.Context, id uuid.UUID) error {
	return s.repo.Collection.Delete(ctx, id, auth.UserID(ctx))
}
