package repository

import (
	"context"
	"database/sql"
	"fmt"

	"birdie-and-claire/internal/models"

	"github.com/google/uuid"
	"github.com/pgvector/pgvector-go"
)

type ProductRepository interface {
	Exists(ctx context.Context, productID uuid.UUID) (bool, error)
	// FindSimilar ranks a slot's products by distance to embedding, less a bonus per matching niceTag; pass the tags lowercase.
	FindSimilar(ctx context.Context, embedding []float32, slot models.ProductSlot, excludeTags, niceTags []string, limit int) ([]models.RecommendedProduct, error)
}

// untuned: a guess at how much one matching nice tag is worth in cosine distance
const bonusPerTag = 0.02

type productRepository struct {
	db *sql.DB
}

func NewProductRepository(database *sql.DB) ProductRepository {
	return &productRepository{db: database}
}

func (r *productRepository) Exists(ctx context.Context, productID uuid.UUID) (bool, error) {
	var exists bool
	err := r.db.QueryRowContext(ctx, `
		SELECT EXISTS(SELECT 1 FROM products WHERE id = $1)
	`, productID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check product %s exists: %w", productID, err)
	}
	return exists, nil
}

func (r *productRepository) FindSimilar(ctx context.Context, embedding []float32, slot models.ProductSlot, excludeTags, niceTags []string, limit int) ([]models.RecommendedProduct, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT p.id, p.shopify_id, p.handle, p.title, p.product_type, p.slot, p.tags, p.created_at, p.updated_at,
			first_image.url
		FROM products p
		LEFT JOIN LATERAL (
			SELECT pi.url
			FROM product_images pi
			WHERE pi.product_id = p.id
			ORDER BY pi.position, pi.id
			LIMIT 1
		) first_image ON true
		WHERE p.embedding IS NOT NULL
			AND p.slot = $2
			-- stored tags keep the catalog's casing, so only that side is lowered; a NULL list matches no tag
			AND NOT EXISTS (SELECT 1 FROM unnest(p.tags) tag WHERE lower(tag) = ANY($3::text[]))
		-- <=> is pgvector's cosine distance, so smaller means more similar.
		ORDER BY (p.embedding <=> $1)
			- $4::float8 * (SELECT count(*) FROM unnest(p.tags) tag WHERE lower(tag) = ANY($5::text[])),
			p.id
		LIMIT $6
	`, pgvector.NewVector(embedding), slot, excludeTags, bonusPerTag, niceTags, limit)
	if err != nil {
		return nil, fmt.Errorf("find similar products in slot %s: %w", slot, err)
	}
	defer func() { _ = rows.Close() }()

	products := make([]models.RecommendedProduct, 0)
	for rows.Next() {
		var product models.RecommendedProduct
		if err := rows.Scan(
			&product.ID,
			&product.ShopifyID,
			&product.Handle,
			&product.Title,
			&product.ProductType,
			&product.Slot,
			&product.Tags,
			&product.CreatedAt,
			&product.UpdatedAt,
			&product.ImageURL,
		); err != nil {
			return nil, fmt.Errorf("scan similar product in slot %s: %w", slot, err)
		}
		products = append(products, product)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate similar products in slot %s: %w", slot, err)
	}
	return products, nil
}
