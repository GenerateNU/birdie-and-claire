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

// Create's statement can raise 23503 on several keys; only this one means the client sent an unknown product.
const outfitProductFKey = "outfit_products_product_id_fkey"

type OutfitRepository interface {
	Create(ctx context.Context, params models.CreateOutfitParams, userID uuid.UUID) (models.Outfit, []models.Product, error)
	GetByID(ctx context.Context, id uuid.UUID) (models.Outfit, []models.Product, error)
}

var _ OutfitRepository = (*outfitRepository)(nil)

type outfitRepository struct {
	db *sql.DB
}

func NewOutfitRepository(database *sql.DB) OutfitRepository {
	return &outfitRepository{db: database}
}

func (r *outfitRepository) Create(ctx context.Context, params models.CreateOutfitParams, userID uuid.UUID) (models.Outfit, []models.Product, error) {
	rows, err := r.db.QueryContext(ctx, `
		WITH new_outfit AS (
			INSERT INTO outfits (user_id, name)
			VALUES ($1, $2)
			RETURNING id, user_id, name, created_at, updated_at
		), new_outfit_products AS (
			INSERT INTO outfit_products (outfit_id, product_id)
			SELECT new_outfit.id, unnest($3::uuid[]) FROM new_outfit
			RETURNING outfit_id, product_id
		)
		SELECT o.id, o.user_id, o.name, o.created_at, o.updated_at,
			p.id, p.shopify_id, p.handle, p.title, p.product_type, p.tags, p.created_at, p.updated_at
		-- A WITH's parts share one snapshot, so the outfit_products table can't see these rows yet.
		FROM new_outfit_products op
		JOIN new_outfit o ON o.id = op.outfit_id
		JOIN products p ON p.id = op.product_id
		ORDER BY p.id
	`, userID, params.Name, params.ProductIDs)
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == foreignKeyViolation && pgErr.ConstraintName == outfitProductFKey {
		return models.Outfit{}, nil, fmt.Errorf("create outfit: unknown product: %w", errs.ErrConflict)
	}
	if err != nil {
		return models.Outfit{}, nil, fmt.Errorf("create outfit: %w", err)
	}
	defer func() { _ = rows.Close() }()

	var outfit models.Outfit
	products := make([]models.Product, 0, len(params.ProductIDs))
	for rows.Next() {
		var product models.Product
		targets := []any{&outfit.ID, &outfit.UserID, &outfit.Name, &outfit.CreatedAt, &outfit.UpdatedAt}
		if err := rows.Scan(append(targets, productScanTargets(&product)...)...); err != nil {
			return models.Outfit{}, nil, fmt.Errorf("scan created outfit: %w", err)
		}
		products = append(products, product)
	}
	if err := rows.Err(); err != nil {
		return models.Outfit{}, nil, fmt.Errorf("iterate created outfit: %w", err)
	}
	return outfit, products, nil
}

func (r *outfitRepository) GetByID(ctx context.Context, id uuid.UUID) (models.Outfit, []models.Product, error) {
	var outfit models.Outfit
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
		return models.Outfit{}, nil, fmt.Errorf("get outfit %s: %w", id, errs.ErrNotFound)
	}
	if err != nil {
		return models.Outfit{}, nil, fmt.Errorf("get outfit %s: %w", id, err)
	}

	products, err := r.findOutfitProducts(ctx, id)
	if err != nil {
		return models.Outfit{}, nil, err
	}
	return outfit, products, nil
}

func (r *outfitRepository) findOutfitProducts(ctx context.Context, outfitID uuid.UUID) ([]models.Product, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT p.id, p.shopify_id, p.handle, p.title, p.product_type, p.tags, p.created_at, p.updated_at
		FROM products p
		JOIN outfit_products op ON op.product_id = p.id
		WHERE op.outfit_id = $1
		ORDER BY p.id
	`, outfitID)
	if err != nil {
		return nil, fmt.Errorf("query outfit products: %w", err)
	}
	defer func() { _ = rows.Close() }()

	products := make([]models.Product, 0)
	for rows.Next() {
		var product models.Product
		if err := rows.Scan(productScanTargets(&product)...); err != nil {
			return nil, fmt.Errorf("scan outfit product: %w", err)
		}
		products = append(products, product)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate outfit products: %w", err)
	}
	return products, nil
}

// productScanTargets matches the p.id through p.updated_at column order both queries select.
func productScanTargets(product *models.Product) []any {
	return []any{
		&product.ID,
		&product.ShopifyID,
		&product.Handle,
		&product.Title,
		&product.ProductType,
		// text[] scans into []string.
		&product.Tags,
		&product.CreatedAt,
		&product.UpdatedAt,
	}
}
