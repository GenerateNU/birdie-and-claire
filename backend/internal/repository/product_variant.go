package repository

import (
	"context"
	"database/sql"
	"fmt"

	"birdie-and-claire/internal/models"
	"birdie-and-claire/internal/shopify"

	"github.com/google/uuid"
)

type ProductVariantRepository interface {
	// ReplaceShopifyVariants makes the product's variants match variants: it upserts each one on its shopify_id and
	// deletes the product's variants that are not in the list.
	ReplaceShopifyVariants(ctx context.Context, productID uuid.UUID, variants []shopify.ShopifyVariant) error
	// FirstAvailableByProductIDs maps each product to its available variant with the lowest position. A product with
	// no available variant is not in the map.
	FirstAvailableByProductIDs(ctx context.Context, productIDs []uuid.UUID) (map[uuid.UUID]models.ProductVariant, error)
}

type productVariantRepository struct {
	db *sql.DB
}

func NewProductVariantRepository(database *sql.DB) ProductVariantRepository {
	return &productVariantRepository{db: database}
}

func (r *productVariantRepository) ReplaceShopifyVariants(ctx context.Context, productID uuid.UUID, variants []shopify.ShopifyVariant) error {
	// <> ALL over a NULL array deletes nothing, so these start empty rather than nil
	shopifyIDs := make([]int64, 0, len(variants))
	availables := make([]bool, 0, len(variants))
	positions := make([]int64, 0, len(variants))
	for _, variant := range variants {
		shopifyIDs = append(shopifyIDs, variant.ID)
		availables = append(availables, variant.Available)
		positions = append(positions, int64(variant.Position))
	}

	_, err := r.db.ExecContext(ctx, `
		WITH removed AS (
			DELETE FROM product_variants
			WHERE product_id = $1 AND shopify_id <> ALL($2::bigint[])
		)
		INSERT INTO product_variants (shopify_id, product_id, available, position)
		SELECT incoming.shopify_id, $1, incoming.available, incoming.position
		FROM unnest($2::bigint[], $3::boolean[], $4::int[]) AS incoming(shopify_id, available, position)
		ON CONFLICT (shopify_id) DO UPDATE SET
			product_id = EXCLUDED.product_id,
			available = EXCLUDED.available,
			position = EXCLUDED.position,
			updated_at = now()
		WHERE (product_variants.product_id, product_variants.available, product_variants.position)
			IS DISTINCT FROM (EXCLUDED.product_id, EXCLUDED.available, EXCLUDED.position)
	`, productID, shopifyIDs, availables, positions)
	if err != nil {
		return fmt.Errorf("replace shopify variants of product %s: %w", productID, err)
	}
	return nil
}

func (r *productVariantRepository) FirstAvailableByProductIDs(ctx context.Context, productIDs []uuid.UUID) (map[uuid.UUID]models.ProductVariant, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT DISTINCT ON (product_id) shopify_id, product_id
		FROM product_variants
		WHERE product_id = ANY($1) AND available
		ORDER BY product_id, position, id
	`, productIDs)
	if err != nil {
		return nil, fmt.Errorf("query first available variants: %w", err)
	}
	defer func() { _ = rows.Close() }()

	variants := make(map[uuid.UUID]models.ProductVariant)
	for rows.Next() {
		var variant models.ProductVariant
		if err := rows.Scan(&variant.ShopifyID, &variant.ProductID); err != nil {
			return nil, fmt.Errorf("scan first available variant: %w", err)
		}
		variants[variant.ProductID] = variant
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate first available variants: %w", err)
	}
	return variants, nil
}
