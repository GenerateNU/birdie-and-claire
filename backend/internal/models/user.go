package models

import "github.com/google/uuid"

type User struct {
	ID        uuid.UUID
	Name      string
	AvatarKey *string
}

type UserResponse struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	AvatarURL *string   `json:"profile_picture_url"`
}
