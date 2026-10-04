// Package repository holds every SQL query in the application, one file per
// resource. Nothing above this layer writes SQL.
package repository

import "database/sql"

type Repository struct {
	User           UserRepository
	Outfit         OutfitRepository
	OutfitReaction OutfitReactionRepository
}

func New(database *sql.DB) *Repository {
	return &Repository{
		User:           NewUserRepository(database),
		Outfit:         NewOutfitRepository(database),
		OutfitReaction: NewOutfitReactionRepository(database),
	}
}