// Package repository holds every SQL query in the application, one file per
// resource. Nothing above this layer writes SQL.
package repository

import "database/sql"

type Repository struct {
	User         UserRepository
	Outfit       OutfitRepository
	Product      ProductRepository
	ProductImage ProductImageRepository
}

func New(database *sql.DB) *Repository {
	return &Repository{
		User:         NewUserRepository(database),
		Outfit:       NewOutfitRepository(database),
		Product:      NewProductRepository(database),
		ProductImage: NewProductImageRepository(database),
	}
}
