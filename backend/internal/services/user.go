package services

import (
	"context"
	"errors"
	"fmt"

	"example_project/internal/errs"
	"example_project/internal/log"
	"example_project/internal/models"
	"example_project/internal/repository"
	"example_project/internal/storage"

	"github.com/google/uuid"
)

var allowedAvatarTypes = map[string]bool{
	"image/jpeg": true,
	"image/png":  true,
	"image/webp": true,
}

type UserService interface {
	Get(ctx context.Context, id uuid.UUID) (models.UserResponse, error)
	CreateAvatarUploadURL(ctx context.Context, id uuid.UUID, contentType string) (storage.PresignedUpload, error)
	ConfirmAvatar(ctx context.Context, id uuid.UUID) error
}

type userService struct {
	repo           *repository.Repository
	store          storage.ObjectStore
	maxUploadBytes int64
}

func NewUserService(repo *repository.Repository, store storage.ObjectStore, maxUploadBytes int64) UserService {
	return &userService{repo: repo, store: store, maxUploadBytes: maxUploadBytes}
}

func (s *userService) Get(ctx context.Context, id uuid.UUID) (models.UserResponse, error) {
	user, err := s.repo.User.GetByID(ctx, id)
	if err != nil {
		return models.UserResponse{}, err
	}

	response := models.UserResponse{ID: user.ID, Name: user.Name}
	if user.AvatarKey != nil {
		url := s.store.PublicURL(*user.AvatarKey)
		response.AvatarURL = &url
	}
	return response, nil
}

func (s *userService) CreateAvatarUploadURL(ctx context.Context, id uuid.UUID, contentType string) (storage.PresignedUpload, error) {
	if !allowedAvatarTypes[contentType] {
		return storage.PresignedUpload{}, errs.ErrInvalidInput
	}
	if _, err := s.repo.User.GetByID(ctx, id); err != nil {
		return storage.PresignedUpload{}, err
	}

	upload, err := s.store.PresignPut(ctx, avatarKey(id), contentType)
	if err != nil {
		return storage.PresignedUpload{}, err
	}
	log.Info(ctx, "presigned avatar upload", "user", id)
	return upload, nil
}

func (s *userService) ConfirmAvatar(ctx context.Context, id uuid.UUID) error {
	if _, err := s.repo.User.GetByID(ctx, id); err != nil {
		return err
	}

	key := avatarKey(id)
	info, err := s.store.HeadObject(ctx, key)
	if errors.Is(err, errs.ErrNotFound) {
		// No object at the key means the client never uploaded to the presigned URL.
		return errs.ErrInvalidInput
	}
	if err != nil {
		return err
	}
	if !allowedAvatarTypes[info.ContentType] || info.Size <= 0 || info.Size > s.maxUploadBytes {
		return errs.ErrInvalidInput
	}

	if err := s.repo.User.SetAvatarKey(ctx, id, key); err != nil {
		return err
	}
	log.Info(ctx, "confirmed avatar upload", "user", id)
	return nil
}

func avatarKey(id uuid.UUID) string {
	return fmt.Sprintf("users/%s/avatar", id)
}
