package routers

import (
	"net/http"

	"example_project/internal/controllers"
	"example_project/internal/services"
	"example_project/internal/types"

	"github.com/danielgtaylor/huma/v2"
)

func UserRoutes(api huma.API, params types.RouteParams) {
	service := services.NewUserService(
		params.ServiceParams.Repository,
		params.ServiceParams.Storage,
		params.ServiceParams.Config.Storage.MaxUploadBytes,
	)
	controller := controllers.NewUserController(service)

	huma.Register(api, huma.Operation{
		OperationID: "get-user",
		Method:      http.MethodGet,
		Path:        "/api/v1/users/{id}",
		Summary:     "Get a user",
		Tags:        []string{"users"},
	}, controller.Get)

	huma.Register(api, huma.Operation{
		OperationID: "create-user-profile-picture-upload-url",
		Method:      http.MethodGet,
		Path:        "/api/v1/users/{id}/profile-picture/upload",
		Summary:     "Get a presigned URL to upload a profile picture",
		Tags:        []string{"users"},
	}, controller.CreateProfilePictureUploadURL)

	huma.Register(api, huma.Operation{
		OperationID: "confirm-user-profile-picture",
		Method:      http.MethodPost,
		Path:        "/api/v1/users/{id}/profile-picture/confirm",
		Summary:     "Confirm a profile picture upload",
		Tags:        []string{"users"},
	}, controller.ConfirmProfilePicture)
}
