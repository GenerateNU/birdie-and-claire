package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"birdie-and-claire/internal/errs"
	"birdie-and-claire/internal/models"
	"birdie-and-claire/internal/utils/pagination"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
)

// AddOwnedProducts' statement can raise 23503 on either key; an unknown product is the client's fault.
const (
	ownedProductProductFKey = "owned_products_product_id_fkey"
	ownedProductUserFKey    = "owned_products_user_id_fkey"
)

type OwnedProductRepository interface {
	ListOwnedProducts(ctx context.Context, userID uuid.UUID, params pagination.CursorParams) (pagination.Page[models.OwnedProductResponse], error)
	// AddOwnedProducts skips products userID already owns, so adding one twice changes nothing.
	AddOwnedProducts(ctx context.Context, userID uuid.UUID, productIDs []uuid.UUID) error
	// RemoveOwnedProduct returns ErrNotFound when userID doesn't own the product.
	RemoveOwnedProduct(ctx context.Context, userID uuid.UUID, productID uuid.UUID) error
}

type ownedProductRepository struct {
	db *sql.DB
}

func NewOwnedProductRepository(database *sql.DB) OwnedProductRepository {
	return &ownedProductRepository{db: database}
}

func (r *ownedProductRepository) ListOwnedProducts(ctx context.Context, userID uuid.UUID, params pagination.CursorParams) (pagination.Page[models.OwnedProductResponse], error) {
	return listProductPage(ctx, r.db, `
		SELECT product_id AS id, created_at AS sorted_at
		FROM owned_products
		WHERE user_id = $1
	`, userID, params, func(product models.ProductResponse, addedAt time.Time) models.OwnedProductResponse {
		return models.OwnedProductResponse{ProductResponse: product, AddedAt: addedAt}
	})
}

func (r *ownedProductRepository) AddOwnedProducts(ctx context.Context, userID uuid.UUID, productIDs []uuid.UUID) error {
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

func (r *ownedProductRepository) RemoveOwnedProduct(ctx context.Context, userID uuid.UUID, productID uuid.UUID) error {
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
