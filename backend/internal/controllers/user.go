package controllers

import (
	"context"

	"example_project/internal/errs"
	"example_project/internal/models"
	"example_project/internal/services"
	"example_project/internal/storage"

	"github.com/google/uuid"
)

type UserController struct {
	service services.UserService
}

func NewUserController(service services.UserService) *UserController {
	return &UserController{service: service}
}

type GetUserInput struct {
	ID uuid.UUID `path:"id" doc:"User ID"`
}

type GetUserOutput struct {
	Body models.UserView
}

func (c *UserController) Get(ctx context.Context, input *GetUserInput) (*GetUserOutput, error) {
	view, err := c.service.Get(ctx, input.ID)
	if err != nil {
		return nil, errs.ToHuma(err)
	}
	return &GetUserOutput{Body: view}, nil
}

type AvatarUploadURLInput struct {
	ID          uuid.UUID `path:"id" doc:"User ID"`
	ContentType string    `query:"content_type" required:"true" doc:"MIME type of the image to upload"`
}

type AvatarUploadURLOutput struct {
	Body storage.PresignedUpload
}

func (c *UserController) AvatarUploadURL(ctx context.Context, input *AvatarUploadURLInput) (*AvatarUploadURLOutput, error) {
	upload, err := c.service.CreateAvatarUploadURL(ctx, input.ID, input.ContentType)
	if err != nil {
		return nil, errs.ToHuma(err)
	}
	return &AvatarUploadURLOutput{Body: upload}, nil
}

type ConfirmAvatarInput struct {
	ID uuid.UUID `path:"id" doc:"User ID"`
}

type ConfirmAvatarOutput struct{}

func (c *UserController) ConfirmAvatar(ctx context.Context, input *ConfirmAvatarInput) (*ConfirmAvatarOutput, error) {
	if err := c.service.ConfirmAvatar(ctx, input.ID); err != nil {
		return nil, errs.ToHuma(err)
	}
	return &ConfirmAvatarOutput{}, nil
}
