package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"birdie-and-claire/internal/errs"
	"birdie-and-claire/internal/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
)

// Postgres SQLSTATE for a foreign key violation.
const foreignKeyViolation = "23503"

type OutfitRepository interface {
	Create(ctx context.Context, name string, userID uuid.UUID, productIDs []uuid.UUID) (models.Outfit, error)
	FindByID(ctx context.Context, id uuid.UUID) (models.OutfitWithProducts, error)
}

var _ OutfitRepository = (*outfitRepository)(nil)

type outfitRepository struct {
	db *sql.DB
}

func NewOutfitRepository(database *sql.DB) OutfitRepository {
	return &outfitRepository{db: database}
}

func (r *outfitRepository) Create(ctx context.Context, name string, userID uuid.UUID, productIDs []uuid.UUID) (models.Outfit, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return models.Outfit{}, fmt.Errorf("begin outfit transaction: %w", err)
	}
	// A no-op once Commit succeeds.
	defer func() { _ = tx.Rollback() }()

	var outfit models.Outfit
	if err := tx.QueryRowContext(ctx, `
		INSERT INTO outfits (user_id, name)
		VALUES ($1, $2)
		RETURNING id, user_id, name, created_at, updated_at
	`, userID, name).Scan(
		&outfit.ID,
		&outfit.UserID,
		&outfit.Name,
		&outfit.CreatedAt,
		&outfit.UpdatedAt,
	); err != nil {
		return models.Outfit{}, fmt.Errorf("insert outfit: %w", err)
	}

	_, err = tx.ExecContext(ctx, `
		INSERT INTO outfit_products (outfit_id, product_id)
		SELECT $1, unnest($2::uuid[])
	`, outfit.ID, productIDs)
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == foreignKeyViolation {
		return models.Outfit{}, fmt.Errorf("insert outfit products: unknown product: %w", errs.ErrConflict)
	}
	if err != nil {
		return models.Outfit{}, fmt.Errorf("insert outfit products: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return models.Outfit{}, fmt.Errorf("commit outfit: %w", err)
	}
	return outfit, nil
}

func (r *outfitRepository) FindByID(ctx context.Context, id uuid.UUID) (models.OutfitWithProducts, error) {
	var outfit models.OutfitWithProducts
	err := r.db.QueryRowContext(ctx, `
		SELECT id, user_id, name, created_at, updated_at
		FROM outfits
		WHERE id = $1
	`, id).Scan(
		&outfit.ID,
		&outfit.UserID,
		&outfit.Name,
		&outfit.CreatedAt,
		&outfit.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return models.OutfitWithProducts{}, fmt.Errorf("find outfit %s: %w", id, errs.ErrNotFound)
	}
	if err != nil {
		return models.OutfitWithProducts{}, fmt.Errorf("find outfit %s: %w", id, err)
	}

	rows, err := r.db.QueryContext(ctx, `
		SELECT p.id, p.shopify_id, p.handle, p.title, p.product_type, p.tags, p.created_at, p.updated_at
		FROM products p
		JOIN outfit_products op ON op.product_id = p.id
		WHERE op.outfit_id = $1
		ORDER BY p.id
	`, id)
	if err != nil {
		return models.OutfitWithProducts{}, fmt.Errorf("query outfit products: %w", err)
	}
	defer func() { _ = rows.Close() }()

	outfit.Products = make([]models.Product, 0)
	for rows.Next() {
		var product models.Product
		// Scan text[] straight into a []string.
		if err := rows.Scan(
			&product.ID,
			&product.ShopifyID,
			&product.Handle,
			&product.Title,
			&product.ProductType,
			&product.Tags,
			&product.CreatedAt,
			&product.UpdatedAt,
		); err != nil {
			return models.OutfitWithProducts{}, fmt.Errorf("scan outfit product: %w", err)
		}
		outfit.Products = append(outfit.Products, product)
	}
	if err := rows.Err(); err != nil {
		return models.OutfitWithProducts{}, fmt.Errorf("iterate outfit products: %w", err)
	}
	return outfit, nil
}
