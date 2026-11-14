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
	// FindSimilar ranks a slot's products by distance to embedding, less a bonus per matching niceTag and a bonus when the
	// product's labeled type is one of typePicks. Tags match both the store's tags and the labeled tag lists, except
	// that a labeled color never excludes; pass them lowercase. typePicks and excludeProductIDs may be nil.
	FindSimilar(ctx context.Context, embedding []float32, slot models.ProductSlot, excludeTags, niceTags, typePicks []string, excludeProductIDs []uuid.UUID, limit int) ([]ScoredProduct, error)
	// GetEmbedding returns a nil embedding for a product that has none yet, and ErrNotFound for a missing product.
	GetEmbedding(ctx context.Context, productID uuid.UUID) ([]float32, models.ProductSlot, error)
	// UpsertShopifyProduct inserts or updates the product as a Birdie & Claire product and marks it active.
	UpsertShopifyProduct(ctx context.Context, product shopify.ShopifyProduct, slot models.ProductSlot) (SyncedProduct, error)
	SaveAttributes(ctx context.Context, productID uuid.UUID, attributes models.ProductAttributes, attributesHash string) error
	SaveEmbedding(ctx context.Context, productID uuid.UUID, embedding []float32, embeddingHash string) error
	ClearEmbedding(ctx context.Context, productID uuid.UUID) error
	// DeactivateShopifyProductsExcept marks inactive every active Birdie & Claire product whose shopify_id is not in
	// keepShopifyIDs, and returns how many it marked. Demo products are left alone.
	DeactivateShopifyProductsExcept(ctx context.Context, keepShopifyIDs []int64) (int64, error)
	ListUnownedProducts(ctx context.Context, userID uuid.UUID, params pagination.CursorParams) (pagination.Page[models.ProductResponse], error)
	// ListBirdieAndClaireProducts lists the active store products in category, marking the ones userID owns.
	ListBirdieAndClaireProducts(ctx context.Context, userID uuid.UUID, category models.ProductCategory, params pagination.CursorParams) (pagination.Page[models.BirdieAndClaireProductResponse], error)
	// FindPurchaseInfo maps each of productIDs that exists to what decides whether userID can buy it.
	FindPurchaseInfo(ctx context.Context, userID uuid.UUID, productIDs []uuid.UUID) (map[uuid.UUID]models.ProductPurchaseInfo, error)
}

const (
	// untuned: a guess at how much one matching nice tag is worth in cosine distance
	bonusPerTag = 0.02
	// untuned: docs/Style_Preferences_Design.md's starting point for a product whose type the shopper picked
	typePickBonus = 0.05
)

// ScoredProduct is a FindSimilar result. A lower score is a better match.
type ScoredProduct struct {
	Product models.ProductResponse
	Score   float64
}

// SyncedProduct is what the catalog sync needs to know about a product it just upserted. Each hash is of what the stored
// value was built from, and nil when the sync has not built it yet.
type SyncedProduct struct {
	ID             uuid.UUID
	AttributesHash *string
	EmbeddingHash  *string
}

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

func (r *productRepository) FindPurchaseInfo(ctx context.Context, userID uuid.UUID, productIDs []uuid.UUID) (map[uuid.UUID]models.ProductPurchaseInfo, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT
			p.id,
			EXISTS (SELECT 1 FROM owned_products o WHERE o.user_id = $1 AND o.product_id = p.id),
			p.active,
			(
				SELECT v.shopify_id FROM product_variants v
				WHERE v.product_id = p.id AND v.available
				ORDER BY v.position, v.id
				LIMIT 1
			)
		FROM products p
		WHERE p.id = ANY($2)
	`, userID, productIDs)
	if err != nil {
		return nil, fmt.Errorf("query purchase info for user %s: %w", userID, err)
	}
	defer func() { _ = rows.Close() }()

	infos := make(map[uuid.UUID]models.ProductPurchaseInfo)
	for rows.Next() {
		var productID uuid.UUID
		var info models.ProductPurchaseInfo
		if err := rows.Scan(&productID, &info.Owned, &info.Active, &info.VariantShopifyID); err != nil {
			return nil, fmt.Errorf("scan purchase info: %w", err)
		}
		infos[productID] = info
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate purchase info for user %s: %w", userID, err)
	}
	return infos, nil
}

func (r *productRepository) FindSimilar(ctx context.Context, embedding []float32, slot models.ProductSlot, excludeTags, niceTags, typePicks []string, excludeProductIDs []uuid.UUID, limit int) ([]ScoredProduct, error) {
	rows, err := r.db.QueryContext(ctx, `
		-- Ranked and limited before the image join, so only the returned products look up an image.
		WITH ranked AS (
			SELECT p.id, p.shopify_id, p.handle, p.title, p.product_type, p.slot, p.source, p.tags, p.created_at, p.updated_at,
				-- <=> is pgvector's cosine distance, so smaller means more similar.
				(p.embedding <=> $1)
					- $4::float8 * (SELECT count(*) FROM unnest(all_tags.tags) tag WHERE tag = ANY($5::text[]))
					-- only the slot's own type is ever set, so the first non-null one is the product's type
					- $8::float8 * COALESCE(COALESCE(p.attributes->>'neckline_type', p.attributes->>'bottom_type', p.attributes->>'shoe_type')
						= ANY($9::text[]), false)::int AS score
			FROM products p
			CROSS JOIN LATERAL (
				-- stored tags keep the catalog's casing, so they are lowered; labeled tags are already lowercase
				SELECT array_agg(DISTINCT tag) AS tags,
					-- a product is sold in every color it lists, so offering one never rules it out
					array_agg(DISTINCT tag) FILTER (WHERE excludable) AS excludable_tags
				FROM (
					SELECT lower(store_tag), true FROM unnest(p.tags) store_tag
					UNION ALL
					SELECT jsonb_array_elements_text(tag_list), name <> 'colors' FROM jsonb_each(p.attributes->'tags') labels(name, tag_list)
				) every_tag(tag, excludable)
			) all_tags
			WHERE p.embedding IS NOT NULL
				AND p.active
				AND p.slot = $2
				-- a NULL list matches no tag
				AND NOT EXISTS (SELECT 1 FROM unnest(all_tags.excludable_tags) tag WHERE tag = ANY($3::text[]))
				-- <> ALL over a NULL array is NULL and would drop every row, so a nil list becomes an empty one
				AND p.id <> ALL(COALESCE($7::uuid[], '{}'))
			ORDER BY score, p.id
			LIMIT $6
		)
		SELECT r.id, r.shopify_id, r.handle, r.title, r.product_type, r.slot, r.source, r.tags, r.created_at, r.updated_at,
			first_image.url, r.score
		FROM ranked r
		LEFT JOIN LATERAL (
			SELECT pi.url
			FROM product_images pi
			WHERE pi.product_id = r.id
			ORDER BY pi.position, pi.id
			LIMIT 1
		) first_image ON true
		ORDER BY r.score, r.id
	`, pgvector.NewVector(embedding), slot, excludeTags, bonusPerTag, niceTags, limit, excludeProductIDs, typePickBonus, typePicks)
	if err != nil {
		return nil, fmt.Errorf("find similar products in slot %s: %w", slot, err)
	}
	defer func() { _ = rows.Close() }()

	products := make([]ScoredProduct, 0)
	for rows.Next() {
		var scored ScoredProduct
		if err := rows.Scan(
			&scored.Product.ID,
			&scored.Product.ShopifyID,
			&scored.Product.Handle,
			&scored.Product.Title,
			&scored.Product.ProductType,
			&scored.Product.Slot,
			&scored.Product.Source,
			&scored.Product.Tags,
			&scored.Product.CreatedAt,
			&scored.Product.UpdatedAt,
			&scored.Product.ImageURL,
			&scored.Score,
		); err != nil {
			return nil, fmt.Errorf("scan similar product in slot %s: %w", slot, err)
		}
		products = append(products, scored)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate similar products in slot %s: %w", slot, err)
	}
	return products, nil
}

func (r *productRepository) UpsertShopifyProduct(ctx context.Context, product shopify.ShopifyProduct, slot models.ProductSlot) (SyncedProduct, error) {
	var synced SyncedProduct
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
			RETURNING id, attributes_hash, embedding_hash
		)
		SELECT id, attributes_hash, embedding_hash FROM upserted
		UNION ALL
		-- the skipped update returns no row, and this select still sees the row as it was before the statement
		SELECT id, attributes_hash, embedding_hash FROM products WHERE shopify_id = $1 AND NOT EXISTS (SELECT 1 FROM upserted)
	`, product.ID, product.Handle, product.Title, product.ProductType, product.Tags, slot).Scan(
		&synced.ID, &synced.AttributesHash, &synced.EmbeddingHash)
	if err != nil {
		return SyncedProduct{}, fmt.Errorf("upsert shopify product %d: %w", product.ID, err)
	}
	return synced, nil
}

func (r *productRepository) SaveAttributes(ctx context.Context, productID uuid.UUID, attributes models.ProductAttributes, attributesHash string) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE products
		SET attributes = $2, attributes_hash = $3
		WHERE id = $1
	`, productID, attributes, attributesHash)
	if err != nil {
		return fmt.Errorf("save attributes of product %s: %w", productID, err)
	}
	return nil
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
	`, userID, params, func(product models.ProductResponse, _ time.Time, _ bool) models.ProductResponse {
		return product
	})
}

func (r *productRepository) ListBirdieAndClaireProducts(ctx context.Context, userID uuid.UUID, category models.ProductCategory, params pagination.CursorParams) (pagination.Page[models.BirdieAndClaireProductResponse], error) {
	// The categories are the picker's tabs from Figma, so Sweaters is split out of the top slot and a dress counts
	// as a jumpsuit. Shoes have no tab. product_type is NULL for some products, hence IS DISTINCT FROM.
	return listProductPage(ctx, r.db, `
		SELECT p.id, p.created_at AS sorted_at
		FROM products p
		WHERE p.source = 'birdie_and_claire'
			AND p.active
			AND CASE $5::text
				WHEN 'tops' THEN p.slot = 'top' AND p.product_type IS DISTINCT FROM 'Sweaters'
				WHEN 'sweaters' THEN p.slot = 'top' AND p.product_type = 'Sweaters'
				WHEN 'bottoms' THEN p.slot = 'bottom'
				WHEN 'jumpsuits' THEN p.slot = 'one_piece'
				WHEN 'accessories' THEN p.slot = 'accessory'
			END
	`, userID, params, func(product models.ProductResponse, _ time.Time, owned bool) models.BirdieAndClaireProductResponse {
		return models.BirdieAndClaireProductResponse{ProductResponse: product, Owned: owned}
	}, category)
}

// listProductPage is the paging query behind every product list. rowSource selects the list's rows as
// (id, sorted_at) and may use $1, the user's ID, and $5 onward for sourceArgs; it is always a constant in this
// package, never input.
// Rows come newest sorted_at first, then by id, and toItem shapes each one for the response, given whether the user
// owns the product.
func listProductPage[T any](
	ctx context.Context,
	db *sql.DB,
	rowSource string,
	userID uuid.UUID,
	params pagination.CursorParams,
	toItem func(product models.ProductResponse, sortedAt time.Time, owned bool) T,
	sourceArgs ...any,
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
			first_image.url, page.sorted_at,
			EXISTS (SELECT 1 FROM owned_products op WHERE op.user_id = $1 AND op.product_id = p.id)
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
	`, append([]any{userID, afterSortedAt, afterID, params.Limit + 1}, sourceArgs...)...)
	if err != nil {
		return pagination.Page[T]{}, fmt.Errorf("list products for user %s: %w", userID, err)
	}
	defer func() { _ = rows.Close() }()

	type row struct {
		product  models.ProductResponse
		sortedAt time.Time
		owned    bool
	}
	fetched := make([]row, 0, params.Limit+1)
	for rows.Next() {
		var next row
		if err := rows.Scan(append(productScanTargets(&next.product), &next.sortedAt, &next.owned)...); err != nil {
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
		items = append(items, toItem(pageRow.product, pageRow.sortedAt, pageRow.owned))
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
