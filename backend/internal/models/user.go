package models

import "github.com/google/uuid"

// User is a row from the users table. AvatarKey is the object storage key for the
// profile picture, nil when the user has none.
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
