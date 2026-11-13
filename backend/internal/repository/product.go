package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"birdie-and-claire/internal/errs"
	"birdie-and-claire/internal/models"
	"birdie-and-claire/internal/shopify"
	"birdie-and-claire/internal/utils/pagination"

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
	// UpsertShopifyProduct inserts or updates the product as a Birdie & Claire product and marks it active. It returns the product's id and the
	// hash its stored embedding was built from, which is nil when the sync has not embedded it yet.
	UpsertShopifyProduct(ctx context.Context, product shopify.ShopifyProduct, slot models.ProductSlot) (uuid.UUID, *string, error)
	SaveEmbedding(ctx context.Context, productID uuid.UUID, embedding []float32, embeddingHash string) error
	ClearEmbedding(ctx context.Context, productID uuid.UUID) error
	// DeactivateShopifyProductsExcept marks inactive every active Birdie & Claire product whose shopify_id is not in
	// keepShopifyIDs, and returns how many it marked. Demo products are left alone.
	DeactivateShopifyProductsExcept(ctx context.Context, keepShopifyIDs []int64) (int64, error)
	ListUnownedProducts(ctx context.Context, userID uuid.UUID, params pagination.CursorParams) (pagination.Page[models.ProductResponse], error)
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
			SELECT p.id, p.shopify_id, p.handle, p.title, p.product_type, p.slot, p.source, p.tags, p.created_at, p.updated_at,
				-- <=> is pgvector's cosine distance, so smaller means more similar.
				(p.embedding <=> $1)
					- $4::float8 * (SELECT count(*) FROM unnest(p.tags) tag WHERE lower(tag) = ANY($5::text[])) AS score
			FROM products p
			WHERE p.embedding IS NOT NULL
				AND p.active
				AND p.slot = $2
				-- stored tags keep the catalog's casing, so only that side is lowered; a NULL list matches no tag
				AND NOT EXISTS (SELECT 1 FROM unnest(p.tags) tag WHERE lower(tag) = ANY($3::text[]))
				-- <> ALL over a NULL array is NULL and would drop every row, so a nil list becomes an empty one
				AND p.id <> ALL(COALESCE($7::uuid[], '{}'))
			ORDER BY score, p.id
			LIMIT $6
		)
		SELECT r.id, r.shopify_id, r.handle, r.title, r.product_type, r.slot, r.source, r.tags, r.created_at, r.updated_at,
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
			&product.Source,
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

func (r *productRepository) UpsertShopifyProduct(ctx context.Context, product shopify.ShopifyProduct, slot models.ProductSlot) (uuid.UUID, *string, error) {
	var id uuid.UUID
	var embeddingHash *string
	err := r.db.QueryRowContext(ctx, `
		WITH upserted AS (
			INSERT INTO products (shopify_id, handle, title, product_type, tags, slot, source)
			VALUES ($1, $2, $3, NULLIF($4, ''), $5, $6, 'birdie_and_claire')
			ON CONFLICT (shopify_id) DO UPDATE SET
				handle = EXCLUDED.handle,
				title = EXCLUDED.title,
				product_type = EXCLUDED.product_type,
				tags = EXCLUDED.tags,
				slot = EXCLUDED.slot,
				active = true,
				updated_at = now()
			-- an unchanged product keeps its updated_at, so a rerun changes nothing
			WHERE (products.handle, products.title, products.product_type, products.tags, products.slot, products.active)
				IS DISTINCT FROM (EXCLUDED.handle, EXCLUDED.title, EXCLUDED.product_type, EXCLUDED.tags, EXCLUDED.slot, true)
			RETURNING id, embedding_hash
		)
		SELECT id, embedding_hash FROM upserted
		UNION ALL
		-- the skipped update returns no row, and this select still sees the row as it was before the statement
		SELECT id, embedding_hash FROM products WHERE shopify_id = $1 AND NOT EXISTS (SELECT 1 FROM upserted)
	`, product.ID, product.Handle, product.Title, product.ProductType, product.Tags, slot).Scan(&id, &embeddingHash)
	if err != nil {
		return uuid.Nil, nil, fmt.Errorf("upsert shopify product %d: %w", product.ID, err)
	}
	return id, embeddingHash, nil
}

func (r *productRepository) SaveEmbedding(ctx context.Context, productID uuid.UUID, embedding []float32, embeddingHash string) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE products
		SET embedding = $2, embedding_hash = $3
		WHERE id = $1
	`, productID, pgvector.NewVector(embedding), embeddingHash)
	if err != nil {
		return fmt.Errorf("save embedding of product %s: %w", productID, err)
	}
	return nil
}

func (r *productRepository) ClearEmbedding(ctx context.Context, productID uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE products
		SET embedding = NULL, embedding_hash = NULL
		WHERE id = $1 AND embedding IS NOT NULL
	`, productID)
	if err != nil {
		return fmt.Errorf("clear embedding of product %s: %w", productID, err)
	}
	return nil
}

func (r *productRepository) DeactivateShopifyProductsExcept(ctx context.Context, keepShopifyIDs []int64) (int64, error) {
	result, err := r.db.ExecContext(ctx, `
		UPDATE products
		SET active = false, updated_at = now()
		WHERE active AND source = 'birdie_and_claire' AND shopify_id <> ALL($1::bigint[])
	`, keepShopifyIDs)
	if err != nil {
		return 0, fmt.Errorf("deactivate shopify products: %w", err)
	}
	deactivated, err := result.RowsAffected()
	if err != nil {
		return 0, fmt.Errorf("count deactivated shopify products: %w", err)
	}
	return deactivated, nil
}

func (r *productRepository) ListUnownedProducts(ctx context.Context, userID uuid.UUID, params pagination.CursorParams) (pagination.Page[models.ProductResponse], error) {
	return listProductPage(ctx, r.db, `
		SELECT p.id, p.created_at AS sorted_at
		FROM products p
		WHERE NOT EXISTS (SELECT 1 FROM owned_products op WHERE op.user_id = $1 AND op.product_id = p.id)
	`, userID, params, func(product models.ProductResponse, _ time.Time) models.ProductResponse {
		return product
	})
}

// listProductPage is the paging query behind every product list. rowSource selects the list's rows as
// (id, sorted_at) and may use $1, the user's ID; it is always a constant in this package, never input.
// Rows come newest sorted_at first, then by id, and toItem shapes each one for the response.
func listProductPage[T any](
	ctx context.Context,
	db *sql.DB,
	rowSource string,
	userID uuid.UUID,
	params pagination.CursorParams,
	toItem func(product models.ProductResponse, sortedAt time.Time) T,
) (pagination.Page[T], error) {
	afterSortedAt, err := params.After().Time("sorted_at")
	if err != nil {
		return pagination.Page[T]{}, fmt.Errorf("list products for user %s: after cursor sorted_at: %w", userID, err)
	}
	afterID, err := params.After().UUID("id")
	if err != nil {
		return pagination.Page[T]{}, fmt.Errorf("list products for user %s: after cursor id: %w", userID, err)
	}

	rows, err := db.QueryContext(ctx, `
		-- Paged before the product and image joins, so only the returned rows look them up.
		WITH page AS (
			SELECT id, sorted_at
			FROM (`+rowSource+`) source
			WHERE ($2::timestamptz IS NULL OR (sorted_at, id) < ($2::timestamptz, $3::uuid))
			ORDER BY sorted_at DESC, id DESC
			LIMIT $4
		)
		SELECT p.id, p.shopify_id, p.handle, p.title, p.product_type, p.slot, p.source, p.tags, p.created_at, p.updated_at,
			first_image.url, page.sorted_at
		FROM page
		JOIN products p ON p.id = page.id
		LEFT JOIN LATERAL (
			SELECT pi.url
			FROM product_images pi
			WHERE pi.product_id = p.id
			ORDER BY pi.position, pi.id
			LIMIT 1
		) first_image ON true
		ORDER BY page.sorted_at DESC, page.id DESC
	`, userID, afterSortedAt, afterID, params.Limit+1)
	if err != nil {
		return pagination.Page[T]{}, fmt.Errorf("list products for user %s: %w", userID, err)
	}
	defer func() { _ = rows.Close() }()

	type row struct {
		product  models.ProductResponse
		sortedAt time.Time
	}
	fetched := make([]row, 0, params.Limit+1)
	for rows.Next() {
		var next row
		if err := rows.Scan(append(productScanTargets(&next.product), &next.sortedAt)...); err != nil {
			return pagination.Page[T]{}, fmt.Errorf("list products for user %s: scan: %w", userID, err)
		}
		fetched = append(fetched, next)
	}
	if err := rows.Err(); err != nil {
		return pagination.Page[T]{}, fmt.Errorf("list products for user %s: iterate: %w", userID, err)
	}

	pageRows, hasMore := pagination.Split(fetched, params.Limit)
	// Non-nil so an empty page encodes as [] rather than null.
	items := make([]T, 0, len(pageRows))
	for _, pageRow := range pageRows {
		items = append(items, toItem(pageRow.product, pageRow.sortedAt))
	}
	page := pagination.Page[T]{Items: items, HasMore: hasMore}
	if !hasMore {
		return page, nil
	}

	last := pageRows[len(pageRows)-1]
	nextCursor, err := pagination.CursorFields{"sorted_at": last.sortedAt, "id": last.product.ID}.Encode()
	if err != nil {
		return pagination.Page[T]{}, fmt.Errorf("list products for user %s: encode cursor: %w", userID, err)
	}
	page.NextCursor = &nextCursor
	return page, nil
}

// productScanTargets matches the product columns, id through the first image's url, in select order.
func productScanTargets(product *models.ProductResponse) []any {
	return []any{
		&product.ID,
		&product.ShopifyID,
		&product.Handle,
		&product.Title,
		&product.ProductType,
		&product.Slot,
		&product.Source,
		// text[] scans into []string.
		&product.Tags,
		&product.CreatedAt,
		&product.UpdatedAt,
		&product.ImageURL,
	}
}
