package controllers

import (
	"context"

	"birdie-and-claire/internal/errs"
	"birdie-and-claire/internal/models"
	"birdie-and-claire/internal/services"

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
	Body models.UserResponse
}

func (c *UserController) Get(ctx context.Context, input *GetUserInput) (*GetUserOutput, error) {
	response, err := c.service.Get(ctx, input.ID)
	if err != nil {
		return nil, errs.ToHuma(err)
	}
	return &GetUserOutput{Body: response}, nil
}

type ProfilePictureUploadURLInput struct {
	ContentType string `query:"content_type" required:"true" enum:"image/jpeg,image/png,image/webp" doc:"MIME type of the image to upload"`
}

type ProfilePictureUploadResponse struct {
	URL     string            `json:"url"`
	Method  string            `json:"method"`
	Headers map[string]string `json:"headers"`
	Key     string            `json:"key"`
}

type ProfilePictureUploadURLOutput struct {
	Body ProfilePictureUploadResponse
}

func (c *UserController) CreateProfilePictureUploadURL(ctx context.Context, input *ProfilePictureUploadURLInput) (*ProfilePictureUploadURLOutput, error) {
	upload, err := c.service.CreateProfilePictureUploadURL(ctx, input.ContentType)
	if err != nil {
		return nil, errs.ToHuma(err)
	}
	return &ProfilePictureUploadURLOutput{Body: ProfilePictureUploadResponse{
		URL:     upload.URL,
		Method:  upload.Method,
		Headers: upload.Headers,
		Key:     upload.Key,
	}}, nil
}

type ConfirmProfilePictureInput struct {
	Body struct {
		Key string `json:"key" doc:"Upload key returned by the upload-URL endpoint"`
	}
}

type ConfirmProfilePictureOutput struct{}

func (c *UserController) ConfirmProfilePicture(ctx context.Context, input *ConfirmProfilePictureInput) (*ConfirmProfilePictureOutput, error) {
	if err := c.service.ConfirmProfilePicture(ctx, input.Body.Key); err != nil {
		return nil, errs.ToHuma(err)
	}
	return &ConfirmProfilePictureOutput{}, nil
}
