package routers

import (
	"net/http"

	"birdie-and-claire/internal/controllers"
	"birdie-and-claire/internal/services"
	"birdie-and-claire/internal/types"

	"github.com/danielgtaylor/huma/v2"
)

func UserRoutes(api huma.API, params types.RouteParams) {
	service := services.NewUserService(
		params.ServiceParams.Repository,
		params.ServiceParams.Storage,
		params.ServiceParams.Config.Storage.MaxUploadBytes,
	)
	controller := controllers.NewUserController(service)

	// Registered before /users/{id}: Fiber matches in registration order, so {id} would capture "me".
	huma.Register(api, huma.Operation{
		OperationID: "get-current-user",
		Method:      http.MethodGet,
		Path:        "/api/v1/users/me",
		Summary:     "Get the caller's user",
		Tags:        []string{"users"},
	}, controller.GetUser)

	huma.Register(api, huma.Operation{
		OperationID:   "create-current-user",
		Method:        http.MethodPost,
		Path:          "/api/v1/users/me",
		DefaultStatus: http.StatusCreated,
		Summary:       "Create the caller's user",
		Tags:          []string{"users"},
	}, controller.CreateUser)

	huma.Register(api, huma.Operation{
		OperationID: "get-user",
		Method:      http.MethodGet,
		Path:        "/api/v1/users/{id}",
		Summary:     "Get a user",
		Tags:        []string{"users"},
	}, controller.GetUserByID)

	huma.Register(api, huma.Operation{
		OperationID: "create-user-profile-picture-upload-url",
		Method:      http.MethodGet,
		Path:        "/api/v1/users/me/profile-picture/upload",
		Summary:     "Get a presigned URL to upload the caller's profile picture",
		Tags:        []string{"users"},
	}, controller.CreateProfilePictureUploadURL)

	huma.Register(api, huma.Operation{
		OperationID: "confirm-user-profile-picture",
		Method:      http.MethodPost,
		Path:        "/api/v1/users/me/profile-picture/confirm",
		Summary:     "Confirm the caller's profile picture upload",
		Tags:        []string{"users"},
	}, controller.ConfirmProfilePicture)
}
