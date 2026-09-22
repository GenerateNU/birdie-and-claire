package services

import (
	"context"
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

// maxAvatarBytes caps a profile picture, checked on confirm.
// TODO: move to StorageConfig once it carries a configurable limit.
const maxAvatarBytes = 5 << 20 // 5 MiB

// UserService reads users and manages their profile pictures. Uploads are
// presigned: the client uploads straight to storage, then confirms so the service
// can verify the object landed before recording it.
type UserService interface {
	Get(ctx context.Context, id uuid.UUID) (models.UserView, error)
	CreateAvatarUploadURL(ctx context.Context, id uuid.UUID, contentType string) (storage.PresignedUpload, error)
	ConfirmAvatar(ctx context.Context, id uuid.UUID) error
}

var _ UserService = (*userService)(nil)

type userService struct {
	repo  *repository.Repository
	store storage.Store
}

func NewUserService(repo *repository.Repository, store storage.Store) UserService {
	return &userService{repo: repo, store: store}
}

func (s *userService) Get(ctx context.Context, id uuid.UUID) (models.UserView, error) {
	user, err := s.repo.User.GetByID(ctx, id)
	if err != nil {
		return models.UserView{}, err
	}

	view := models.UserView{ID: user.ID, Name: user.Name}
	if user.AvatarKey != nil {
		url := s.store.URLFor(*user.AvatarKey)
		view.ProfilePictureURL = &url
	}
	return view, nil
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
	if err != nil {
		// A missing object means the client never uploaded to the presigned URL.
		return errs.ErrInvalidInput
	}
	if !allowedAvatarTypes[info.ContentType] || info.Size <= 0 || info.Size > maxAvatarBytes {
		return errs.ErrInvalidInput
	}

	if err := s.repo.User.SetAvatarKey(ctx, id, key); err != nil {
		return err
	}
	log.Info(ctx, "confirmed avatar upload", "user", id)
	return nil
}

// avatarKey is the fixed object key for a user's avatar, so re-uploads overwrite
// rather than orphaning objects.
func avatarKey(id uuid.UUID) string {
	return fmt.Sprintf("users/%s/avatar", id)
}
