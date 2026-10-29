package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"birdie-and-claire/internal/errs"
	"birdie-and-claire/internal/models"

	"github.com/google/uuid"
	"github.com/pgvector/pgvector-go"
)

type ProductRepository interface {
	Exists(ctx context.Context, productID uuid.UUID) (bool, error)
	// FindSimilar ranks a slot's products by distance to embedding, less a bonus per matching niceTag; pass the tags lowercase.
	// excludeProductIDs may be nil.
	FindSimilar(ctx context.Context, embedding []float32, slot models.ProductSlot, excludeTags, niceTags []string, excludeProductIDs []uuid.UUID, limit int) ([]models.ProductResponse, error)
	// GetEmbedding returns a nil embedding for a product that has none yet, and ErrNotFound for a missing product.
	GetEmbedding(ctx context.Context, productID uuid.UUID) ([]float32, models.ProductSlot, error)
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

func (r *productRepository) GetEmbedding(ctx context.Context, productID uuid.UUID) ([]float32, models.ProductSlot, error) {
	var embedding *pgvector.Vector
	var slot models.ProductSlot
	err := r.db.QueryRowContext(ctx, `
		SELECT embedding, slot
		FROM products
		WHERE id = $1
	`, productID).Scan(&embedding, &slot)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, "", errs.ErrNotFound
	}
	if err != nil {
		return nil, "", fmt.Errorf("get embedding of product %s: %w", productID, err)
	}
	if embedding == nil {
		return nil, slot, nil
	}
	return embedding.Slice(), slot, nil
}

func (r *productRepository) FindSimilar(ctx context.Context, embedding []float32, slot models.ProductSlot, excludeTags, niceTags []string, excludeProductIDs []uuid.UUID, limit int) ([]models.ProductResponse, error) {
	rows, err := r.db.QueryContext(ctx, `
		-- Ranked and limited before the image join, so only the returned products look up an image.
		WITH ranked AS (
			SELECT p.id, p.shopify_id, p.handle, p.title, p.product_type, p.slot, p.tags, p.created_at, p.updated_at,
				-- <=> is pgvector's cosine distance, so smaller means more similar.
				(p.embedding <=> $1)
					- $4::float8 * (SELECT count(*) FROM unnest(p.tags) tag WHERE lower(tag) = ANY($5::text[])) AS score
			FROM products p
			WHERE p.embedding IS NOT NULL
				AND p.slot = $2
				-- stored tags keep the catalog's casing, so only that side is lowered; a NULL list matches no tag
				AND NOT EXISTS (SELECT 1 FROM unnest(p.tags) tag WHERE lower(tag) = ANY($3::text[]))
				-- <> ALL over a NULL array is NULL and would drop every row, so a nil list becomes an empty one
				AND p.id <> ALL(COALESCE($7::uuid[], '{}'))
			ORDER BY score, p.id
			LIMIT $6
		)
		SELECT r.id, r.shopify_id, r.handle, r.title, r.product_type, r.slot, r.tags, r.created_at, r.updated_at,
			first_image.url
		FROM ranked r
		LEFT JOIN LATERAL (
			SELECT pi.url
			FROM product_images pi
			WHERE pi.product_id = r.id
			ORDER BY pi.position, pi.id
			LIMIT 1
		) first_image ON true
		ORDER BY r.score, r.id
	`, pgvector.NewVector(embedding), slot, excludeTags, bonusPerTag, niceTags, limit, excludeProductIDs)
	if err != nil {
		return nil, fmt.Errorf("find similar products in slot %s: %w", slot, err)
	}
	defer func() { _ = rows.Close() }()

	products := make([]models.ProductResponse, 0)
	for rows.Next() {
		var product models.ProductResponse
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
