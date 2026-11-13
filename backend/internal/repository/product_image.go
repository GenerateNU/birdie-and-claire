package repository

import (
	"context"
	"database/sql"
	"fmt"

	"birdie-and-claire/internal/models"
	"birdie-and-claire/internal/shopify"

	"github.com/google/uuid"
)

type ProductImageRepository interface {
	FindByProductID(ctx context.Context, productID uuid.UUID) ([]models.ProductImage, error)
	// ReplaceShopifyImages makes the product's images match images: it upserts each one on its shopify_id and deletes
	// the product's images that are not in the list.
	ReplaceShopifyImages(ctx context.Context, productID uuid.UUID, images []shopify.ShopifyImage) error
}

type productImageRepository struct {
	db *sql.DB
}

func NewProductImageRepository(database *sql.DB) ProductImageRepository {
	return &productImageRepository{db: database}
}

func (r *productImageRepository) FindByProductID(ctx context.Context, productID uuid.UUID) ([]models.ProductImage, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, shopify_id, product_id, url, alt_text, width, height, position, created_at, updated_at
		FROM product_images
		WHERE product_id = $1
		ORDER BY position, id
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

func (r *productImageRepository) ReplaceShopifyImages(ctx context.Context, productID uuid.UUID, images []shopify.ShopifyImage) error {
	// <> ALL over a NULL array deletes nothing, so these start empty rather than nil
	shopifyIDs := make([]int64, 0, len(images))
	urls := make([]string, 0, len(images))
	altTexts := make([]string, 0, len(images))
	widths := make([]int64, 0, len(images))
	heights := make([]int64, 0, len(images))
	positions := make([]int64, 0, len(images))
	for _, image := range images {
		shopifyIDs = append(shopifyIDs, image.ID)
		urls = append(urls, image.URL)
		altTexts = append(altTexts, image.AltText)
		widths = append(widths, int64(image.Width))
		heights = append(heights, int64(image.Height))
		positions = append(positions, int64(image.Position))
	}

	_, err := r.db.ExecContext(ctx, `
		WITH removed AS (
			DELETE FROM product_images
			WHERE product_id = $1 AND shopify_id <> ALL($2::bigint[])
		)
		INSERT INTO product_images (shopify_id, product_id, url, alt_text, width, height, position)
		-- Shopify sends "" and 0 for a missing alt text or size, which are NULL here
		SELECT incoming.shopify_id, $1, incoming.url, NULLIF(incoming.alt_text, ''), NULLIF(incoming.width, 0),
			NULLIF(incoming.height, 0), incoming.position
		FROM unnest($2::bigint[], $3::text[], $4::text[], $5::int[], $6::int[], $7::int[])
			AS incoming(shopify_id, url, alt_text, width, height, position)
		ON CONFLICT (shopify_id) DO UPDATE SET
			product_id = EXCLUDED.product_id,
			url = EXCLUDED.url,
			alt_text = EXCLUDED.alt_text,
			width = EXCLUDED.width,
			height = EXCLUDED.height,
			position = EXCLUDED.position,
			updated_at = now()
		WHERE (product_images.product_id, product_images.url, product_images.alt_text, product_images.width,
				product_images.height, product_images.position)
			IS DISTINCT FROM (EXCLUDED.product_id, EXCLUDED.url, EXCLUDED.alt_text, EXCLUDED.width, EXCLUDED.height,
				EXCLUDED.position)
	`, productID, shopifyIDs, urls, altTexts, widths, heights, positions)
	if err != nil {
		return fmt.Errorf("replace shopify images of product %s: %w", productID, err)
	}
	return nil
}
