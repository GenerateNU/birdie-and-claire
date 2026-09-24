package models

import "github.com/google/uuid"

type User struct {
	ID        uuid.UUID
	Name      string
	AvatarKey *string
}

type UserView struct {
	ID                uuid.UUID `json:"id"`
	Name              string    `json:"name"`
	ProfilePictureURL *string   `json:"profile_picture_url"`
}
