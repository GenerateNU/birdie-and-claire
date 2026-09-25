// Package repository holds every SQL query in the application, one file per
// resource. Nothing above this layer writes SQL.
package repository

import "database/sql"

type Repository struct {
	Character CharacterRepository
	User      UserRepository
}

func New(database *sql.DB) *Repository {
	return &Repository{
		Character: NewCharacterRepository(database),
		User:      NewUserRepository(database),
	}
}
