package services

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"birdie-and-claire/internal/auth"
	"birdie-and-claire/internal/errs"
	"birdie-and-claire/internal/log"
	"birdie-and-claire/internal/models"
	"birdie-and-claire/internal/repository"
	"birdie-and-claire/internal/storage"

	"github.com/google/uuid"
)

var allowedProfilePictureTypes = map[string]bool{
	"image/jpeg": true,
	"image/png":  true,
	"image/webp": true,
}

type UserService interface {
	GetUser(ctx context.Context) (models.CurrentUserResponse, error)
	GetUserByID(ctx context.Context, id uuid.UUID) (models.UserResponse, error)
	CreateUser(ctx context.Context, name string) (models.UserResponse, error)
	ReplaceStylePreferences(ctx context.Context, preferences models.StylePreferences) (models.CurrentUserResponse, error)
	ClearStylePreferences(ctx context.Context) error
	CreateProfilePictureUploadURL(ctx context.Context, contentType string) (storage.PresignedUpload, error)
	ConfirmProfilePicture(ctx context.Context, key string) error
}

type userService struct {
	repo           *repository.Repository
	store          storage.ObjectStore
	maxUploadBytes int64
}

func NewUserService(repo *repository.Repository, store storage.ObjectStore, maxUploadBytes int64) UserService {
	return &userService{repo: repo, store: store, maxUploadBytes: maxUploadBytes}
}

func (s *userService) GetUser(ctx context.Context) (models.CurrentUserResponse, error) {
	user, err := s.repo.User.GetByID(ctx, auth.UserID(ctx))
	if err != nil {
		return models.CurrentUserResponse{}, err
	}
	return models.CurrentUserResponse{UserResponse: s.buildUserResponse(user), StylePreferences: user.StylePreferences}, nil
}

func (s *userService) GetUserByID(ctx context.Context, id uuid.UUID) (models.UserResponse, error) {
	user, err := s.repo.User.GetByID(ctx, id)
	if err != nil {
		return models.UserResponse{}, err
	}
	return s.buildUserResponse(user), nil
}

func (s *userService) CreateUser(ctx context.Context, name string) (models.UserResponse, error) {
	id := auth.UserID(ctx)
	user, err := s.repo.User.CreateUser(ctx, id, name)
	if err != nil {
		return models.UserResponse{}, err
	}
	log.Debug(ctx, "created user", "user", id)
	return models.UserResponse{ID: user.ID, Name: user.Name}, nil
}

func (s *userService) ReplaceStylePreferences(ctx context.Context, preferences models.StylePreferences) (models.CurrentUserResponse, error) {
	id := auth.UserID(ctx)
	user, err := s.repo.User.ReplaceStylePreferences(ctx, id, preferences)
	if err != nil {
		return models.CurrentUserResponse{}, err
	}
	log.Debug(ctx, "replaced style preferences", "user", id)
	return models.CurrentUserResponse{UserResponse: s.buildUserResponse(user), StylePreferences: user.StylePreferences}, nil
}

func (s *userService) ClearStylePreferences(ctx context.Context) error {
	id := auth.UserID(ctx)
	if err := s.repo.User.ClearStylePreferences(ctx, id); err != nil {
		return err
	}
	log.Debug(ctx, "cleared style preferences", "user", id)
	return nil
}

func (s *userService) buildUserResponse(user models.User) models.UserResponse {
	response := models.UserResponse{ID: user.ID, Name: user.Name}
	if user.ProfilePictureKey != nil {
		url := s.store.PublicURL(*user.ProfilePictureKey)
		response.ProfilePictureURL = &url
	}
	return response
}

func (s *userService) CreateProfilePictureUploadURL(ctx context.Context, contentType string) (storage.PresignedUpload, error) {
	id := auth.UserID(ctx)
	if !allowedProfilePictureTypes[contentType] {
		return storage.PresignedUpload{}, errs.ErrInvalidInput
	}
	if _, err := s.repo.User.GetByID(ctx, id); err != nil {
		return storage.PresignedUpload{}, err
	}

	// A fresh key per upload: each PUT lands on its own immutable object, so
	// validation and publication act on exactly the bytes that were uploaded, and
	// concurrent uploads never collide. The client returns this key to confirm.
	upload, err := s.store.PresignPut(ctx, uploadPrefix(id)+uuid.NewString(), contentType)
	if err != nil {
		return storage.PresignedUpload{}, err
	}
	log.Debug(ctx, "presigned profile picture upload", "user", id)
	return upload, nil
}

func (s *userService) ConfirmProfilePicture(ctx context.Context, key string) error {
	id := auth.UserID(ctx)

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
	log.Debug(ctx, "confirmed profile picture upload", "user", id)

	// Best-effort delete of the picture this one replaced; a failed delete only
	// leaves a stray object, never affects what is served.
	replaced := user.ProfilePictureKey
	if replaced == nil || *replaced == key {
		return nil
	}
	if err := s.store.DeleteObject(ctx, *replaced); err != nil {
		log.Warn(ctx, "delete replaced profile picture failed", "user", id, "error", err)
	}
	return nil
}

func uploadPrefix(id uuid.UUID) string {
	return fmt.Sprintf("users/%s/pictures/", id)
}
