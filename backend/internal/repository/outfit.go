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

// Postgres SQLSTATE for a foreign key violation.
const foreignKeyViolation = "23503"

// Create's statement can raise 23503 on several keys; only this one means the client sent an unknown product.
const outfitProductFKey = "outfit_products_product_id_fkey"

type OutfitRepository interface {
	Create(ctx context.Context, params models.CreateOutfitParams, userID uuid.UUID) (models.Outfit, []models.Product, error)
	GetByID(ctx context.Context, id uuid.UUID) (models.Outfit, []models.Product, error)
	List(ctx context.Context, userID uuid.UUID, params pagination.CursorParams) ([]models.Outfit, error)
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
	rows, err := r.db.QueryContext(ctx, `
		SELECT o.id, o.user_id, o.name, o.created_at, o.updated_at,
			p.id, p.shopify_id, p.handle, p.title, p.product_type, p.tags, p.created_at, p.updated_at
		FROM outfits o
		LEFT JOIN outfit_products op ON op.outfit_id = o.id
		LEFT JOIN products p ON p.id = op.product_id
		WHERE o.id = $1
		ORDER BY p.id
	`, id)
	if err != nil {
		return models.Outfit{}, nil, fmt.Errorf("get outfit %s: %w", id, err)
	}
	defer func() { _ = rows.Close() }()

	var outfit models.Outfit
	found := false
	products := make([]models.Product, 0)
	for rows.Next() {
		found = true
		var (
			productID            uuid.NullUUID
			shopifyID            sql.NullInt64
			handle, title        sql.NullString
			productType          *string
			tags                 []string
			createdAt, updatedAt sql.NullTime
		)
		if err := rows.Scan(
			&outfit.ID,
			&outfit.UserID,
			&outfit.Name,
			&outfit.CreatedAt,
			&outfit.UpdatedAt,
			&productID,
			&shopifyID,
			&handle,
			&title,
			&productType,
			&tags,
			&createdAt,
			&updatedAt,
		); err != nil {
			return models.Outfit{}, nil, fmt.Errorf("scan outfit %s: %w", id, err)
		}
		// A NULL product id is the LEFT JOIN's row for an outfit with no products.
		if !productID.Valid {
			continue
		}
		products = append(products, models.Product{
			ID:          productID.UUID,
			ShopifyID:   shopifyID.Int64,
			Handle:      handle.String,
			Title:       title.String,
			ProductType: productType,
			Tags:        tags,
			CreatedAt:   createdAt.Time,
			UpdatedAt:   updatedAt.Time,
		})
	}
	if err := rows.Err(); err != nil {
		return models.Outfit{}, nil, fmt.Errorf("iterate outfit %s: %w", id, err)
	}
	if !found {
		return models.Outfit{}, nil, fmt.Errorf("get outfit %s: %w", id, errs.ErrNotFound)
	}
	return outfit, products, nil
}

// List returns up to params.Limit+1 of the user's outfits, newest first, so the caller can tell if more remain.
func (r *outfitRepository) List(ctx context.Context, userID uuid.UUID, params pagination.CursorParams) ([]models.Outfit, error) {
	afterCreatedAt, err := params.After().Time("created_at")
	if err != nil {
		return nil, fmt.Errorf("list outfits: after cursor: %w", err)
	}
	afterID, err := params.After().UUID("id")
	if err != nil {
		return nil, fmt.Errorf("list outfits: after cursor: %w", err)
	}

	// No products join: under LIMIT it would count joined rows, not outfits.
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, user_id, name, created_at, updated_at
		FROM outfits
		WHERE user_id = $1
			AND ($2::timestamptz IS NULL OR (created_at, id) < ($2::timestamptz, $3::uuid))
		ORDER BY created_at DESC, id DESC
		LIMIT $4
	`, userID, afterCreatedAt, afterID, params.Limit+1)
	if err != nil {
		return nil, fmt.Errorf("list outfits: %w", err)
	}
	defer func() { _ = rows.Close() }()

	// Non-nil so an empty page encodes as [] rather than null.
	outfits := make([]models.Outfit, 0, params.Limit+1)
	for rows.Next() {
		var outfit models.Outfit
		if err := rows.Scan(&outfit.ID, &outfit.UserID, &outfit.Name, &outfit.CreatedAt, &outfit.UpdatedAt); err != nil {
			return nil, fmt.Errorf("list outfits: scan: %w", err)
		}
		outfits = append(outfits, outfit)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list outfits: iterate: %w", err)
	}
	return outfits, nil
}

// productScanTargets matches the p.id through p.updated_at column order Create selects.
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
