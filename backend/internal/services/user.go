package services

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"example_project/internal/errs"
	"example_project/internal/log"
	"example_project/internal/models"
	"example_project/internal/repository"
	"example_project/internal/storage"

	"github.com/google/uuid"
)

var allowedProfilePictureTypes = map[string]bool{
	"image/jpeg": true,
	"image/png":  true,
	"image/webp": true,
}

type UserService interface {
	Get(ctx context.Context, id uuid.UUID) (models.UserResponse, error)
	CreateProfilePictureUploadURL(ctx context.Context, id uuid.UUID, contentType string) (storage.PresignedUpload, error)
	ConfirmProfilePicture(ctx context.Context, id uuid.UUID, key string) error
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
	if user.ProfilePictureKey != nil {
		url := s.store.PublicURL(*user.ProfilePictureKey)
		response.ProfilePictureURL = &url
	}
	return response, nil
}

func (s *userService) CreateProfilePictureUploadURL(ctx context.Context, id uuid.UUID, contentType string) (storage.PresignedUpload, error) {
	if !allowedProfilePictureTypes[contentType] {
		return storage.PresignedUpload{}, errs.ErrInvalidInput
	}
	if _, err := s.repo.User.GetByID(ctx, id); err != nil {
		return storage.PresignedUpload{}, err
	}

	// A fresh key per upload: each PUT lands on its own immutable object, so
	// validation and publication act on exactly the bytes that were uploaded, and
	// concurrent uploads never collide. The client returns this key to confirm.
	upload, err := s.store.PresignPut(ctx, newProfilePictureKey(id), contentType)
	if err != nil {
		return storage.PresignedUpload{}, err
	}
	log.Info(ctx, "presigned profile picture upload", "user", id)
	return upload, nil
}

func (s *userService) ConfirmProfilePicture(ctx context.Context, id uuid.UUID, key string) error {
	// The key comes from the client, so it must be one this user could have been
	// handed — an object under their own upload prefix.
	if !strings.HasPrefix(key, uploadPrefix(id)) {
		return errs.ErrInvalidInput
	}

	user, err := s.repo.User.GetByID(ctx, id)
	if err != nil {
		return err
	}

	info, err := s.store.HeadObject(ctx, key)
	if errors.Is(err, errs.ErrNotFound) {
		// No object at the key means the client never uploaded to the presigned URL.
		return errs.ErrInvalidInput
	}
	if err != nil {
		return err
	}
	if !allowedProfilePictureTypes[info.ContentType] || info.Size <= 0 || info.Size > s.maxUploadBytes {
		return errs.ErrInvalidInput
	}

	// Point the profile at the validated object. The switch is a single DB write
	// against an object that already exists, so nothing half-published can be served.
	if err := s.repo.User.SetProfilePictureKey(ctx, id, key); err != nil {
		return err
	}

	// Delete the picture this one replaced. Best-effort: a failed delete only
	// leaves a stray object, never affects what is served.
	if user.ProfilePictureKey != nil && *user.ProfilePictureKey != key {
		if err := s.store.DeleteObject(ctx, *user.ProfilePictureKey); err != nil {
			log.Warn(ctx, "delete replaced profile picture failed", "user", id, "error", err)
		}
	}
	log.Info(ctx, "confirmed profile picture upload", "user", id)
	return nil
}

func uploadPrefix(id uuid.UUID) string {
	return fmt.Sprintf("users/%s/pictures/", id)
}

func newProfilePictureKey(id uuid.UUID) string {
	return uploadPrefix(id) + uuid.NewString()
}
