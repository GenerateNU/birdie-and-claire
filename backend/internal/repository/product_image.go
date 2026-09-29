package repository

import (
	"context"
	"database/sql"
	"fmt"

	"example_project/internal/models"

	"github.com/google/uuid"
)

// ProductImageRepository owns the product_images table. Rows are written by
// the Shopify sync job; this layer only reads them.
type ProductImageRepository interface {
	ProductExists(ctx context.Context, productID uuid.UUID) (bool, error)
	FindByProductID(ctx context.Context, productID uuid.UUID) ([]models.ProductImage, error)
}

var _ ProductImageRepository = (*productImageRepository)(nil)

type productImageRepository struct {
	db *sql.DB
}

func NewProductImageRepository(database *sql.DB) ProductImageRepository {
	return &productImageRepository{db: database}
}

func (r *productImageRepository) ProductExists(ctx context.Context, productID uuid.UUID) (bool, error) {
	var exists bool
	err := r.db.QueryRowContext(ctx, `
		SELECT EXISTS(SELECT 1 FROM products WHERE id = $1)
	`, productID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check product %s exists: %w", productID, err)
	}
	return exists, nil
}

func (r *productImageRepository) FindByProductID(ctx context.Context, productID uuid.UUID) ([]models.ProductImage, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, shopify_id, product_id, url, alt_text, width, height, position, created_at, updated_at
		FROM product_images
		WHERE product_id = $1
		ORDER BY position
	`, productID)
	if err != nil {
		return nil, fmt.Errorf("query product images: %w", err)
	}
	defer func() { _ = rows.Close() }()

	images := make([]models.ProductImage, 0)
	for rows.Next() {
		var image models.ProductImage
		if err := rows.Scan(
			&image.ID,
			&image.ShopifyID,
			&image.ProductID,
			&image.URL,
			&image.AltText,
			&image.Width,
			&image.Height,
			&image.Position,
			&image.CreatedAt,
			&image.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan product image: %w", err)
		}
		images = append(images, image)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate product images: %w", err)
	}
	return images, nil
}
