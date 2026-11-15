// Package repository holds every SQL query in the application, one file per
// resource. Nothing above this layer writes SQL.
package repository

import "database/sql"

type Repository struct {
	User           UserRepository
	Outfit         OutfitRepository
	Collection     CollectionRepository
	OutfitReaction OutfitReactionRepository
	Product        ProductRepository
	ProductImage   ProductImageRepository
	ProductVariant ProductVariantRepository
	OwnedProduct   OwnedProductRepository
}

func New(database *sql.DB) *Repository {
	return &Repository{
		User:           NewUserRepository(database),
		Outfit:         NewOutfitRepository(database),
		Collection:     NewCollectionRepository(database),
		OutfitReaction: NewOutfitReactionRepository(database),
		Product:        NewProductRepository(database),
		ProductImage:   NewProductImageRepository(database),
		ProductVariant: NewProductVariantRepository(database),
		OwnedProduct:   NewOwnedProductRepository(database),
	}
}
