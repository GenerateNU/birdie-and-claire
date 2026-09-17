// Package repository holds every SQL query in the application, one file per
// resource. Nothing above this layer writes SQL.
package repository

import "database/sql"

// Repository aggregates the per-resource repositories so callers take one
// dependency instead of one per table.
type Repository struct {
	Character CharacterRepository
}

func New(database *sql.DB) *Repository {
	return &Repository{
		Character: NewCharacterRepository(database),
	}
}
