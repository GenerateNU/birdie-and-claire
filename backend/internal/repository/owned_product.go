package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"birdie-and-claire/internal/errs"
	"birdie-and-claire/internal/models"
	"birdie-and-claire/internal/utils/pagination"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
)

// Add's statement can raise 23503 on either key; an unknown product is the client's fault.
const (
	ownedProductProductFKey = "owned_products_product_id_fkey"
	ownedProductUserFKey    = "owned_products_user_id_fkey"
)

type OwnedProductRepository interface {
	// List returns up to params.Limit+1 of the products userID owns, most recently added first.
	List(ctx context.Context, userID uuid.UUID, params pagination.CursorParams) ([]models.OwnedProductResponse, error)
	// Add skips products userID already owns, so adding one twice changes nothing.
	Add(ctx context.Context, userID uuid.UUID, productIDs []uuid.UUID) error
	// Remove returns ErrNotFound when userID doesn't own the product.
	Remove(ctx context.Context, userID uuid.UUID, productID uuid.UUID) error
}

type ownedProductRepository struct {
	db *sql.DB
}

func NewOwnedProductRepository(database *sql.DB) OwnedProductRepository {
	return &ownedProductRepository{db: database}
}

func (r *ownedProductRepository) List(ctx context.Context, userID uuid.UUID, params pagination.CursorParams) ([]models.OwnedProductResponse, error) {
	afterAddedAt, err := params.After().Time("added_at")
	if err != nil {
		return nil, fmt.Errorf("list owned products for user %s: after cursor added_at: %w", userID, err)
	}
	afterProductID, err := params.After().UUID("product_id")
	if err != nil {
		return nil, fmt.Errorf("list owned products for user %s: after cursor product_id: %w", userID, err)
	}

	rows, err := r.db.QueryContext(ctx, `
		-- Paged before the product and image joins, so only the returned rows look them up.
		WITH page AS (
			SELECT product_id, created_at
			FROM owned_products
			WHERE user_id = $1
				AND ($2::timestamptz IS NULL OR (created_at, product_id) < ($2::timestamptz, $3::uuid))
			ORDER BY created_at DESC, product_id DESC
			LIMIT $4
		)
		SELECT p.id, p.shopify_id, p.handle, p.title, p.product_type, p.slot, p.tags, p.created_at, p.updated_at,
			first_image.url, page.created_at
		FROM page
		JOIN products p ON p.id = page.product_id
		LEFT JOIN LATERAL (
			SELECT pi.url
			FROM product_images pi
			WHERE pi.product_id = p.id
			ORDER BY pi.position, pi.id
			LIMIT 1
		) first_image ON true
		ORDER BY page.created_at DESC, page.product_id DESC
	`, userID, afterAddedAt, afterProductID, params.Limit+1)
	if err != nil {
		return nil, fmt.Errorf("list owned products for user %s: %w", userID, err)
	}
	defer func() { _ = rows.Close() }()

	// Non-nil so an empty page encodes as [] rather than null.
	owned := make([]models.OwnedProductResponse, 0, params.Limit+1)
	for rows.Next() {
		var product models.OwnedProductResponse
		if err := rows.Scan(append(productScanTargets(&product.ProductResponse), &product.AddedAt)...); err != nil {
			return nil, fmt.Errorf("list owned products for user %s: scan: %w", userID, err)
		}
		owned = append(owned, product)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list owned products for user %s: iterate: %w", userID, err)
	}
	return owned, nil
}

func (r *ownedProductRepository) Add(ctx context.Context, userID uuid.UUID, productIDs []uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO owned_products (user_id, product_id)
		SELECT $1, unnest($2::uuid[])
		ON CONFLICT (user_id, product_id) DO NOTHING
	`, userID, productIDs)
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == foreignKeyViolation && pgErr.ConstraintName == ownedProductProductFKey {
		return fmt.Errorf("add owned products for user %s: unknown product: %w", userID, errs.ErrConflict)
	}
	if errors.As(err, &pgErr) && pgErr.Code == foreignKeyViolation && pgErr.ConstraintName == ownedProductUserFKey {
		return fmt.Errorf("add owned products: unknown user %s: %w", userID, errs.ErrNotFound)
	}
	if err != nil {
		return fmt.Errorf("add owned products for user %s: %w", userID, err)
	}
	return nil
}

func (r *ownedProductRepository) Remove(ctx context.Context, userID uuid.UUID, productID uuid.UUID) error {
	var removed uuid.UUID
	err := r.db.QueryRowContext(ctx, `
		DELETE FROM owned_products
		WHERE user_id = $1 AND product_id = $2
		RETURNING product_id
	`, userID, productID).Scan(&removed)
	if errors.Is(err, sql.ErrNoRows) {
		return errs.ErrNotFound
	}
	if err != nil {
		return fmt.Errorf("remove owned product %s for user %s: %w", productID, userID, err)
	}
	return nil
}
