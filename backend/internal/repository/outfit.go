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

// Match the product key by name.
const outfitProductFKey = "outfit_products_product_id_fkey"

type OutfitRepository interface {
	Create(ctx context.Context, params models.CreateOutfitParams, userID uuid.UUID) (models.OutfitResponse, error)
	GetByID(ctx context.Context, id uuid.UUID) (models.OutfitResponse, error)
}

var _ OutfitRepository = (*outfitRepository)(nil)

type outfitRepository struct {
	db *sql.DB
}

func NewOutfitRepository(database *sql.DB) OutfitRepository {
	return &outfitRepository{db: database}
}

func (r *outfitRepository) Create(ctx context.Context, params models.CreateOutfitParams, userID uuid.UUID) (models.OutfitResponse, error) {
	// A WITH's parts share one snapshot, so outfit_products can't see new_links' rows yet.
	rows, err := r.db.QueryContext(ctx, `
		WITH new_outfit AS (
			INSERT INTO outfits (user_id, name)
			VALUES ($1, $2)
			RETURNING id, user_id, name, created_at, updated_at
		), new_links AS (
			INSERT INTO outfit_products (outfit_id, product_id)
			SELECT new_outfit.id, unnest($3::uuid[]) FROM new_outfit
			RETURNING outfit_id, product_id
		)
		SELECT o.id, o.user_id, o.name, o.created_at, o.updated_at,
			p.id, p.shopify_id, p.handle, p.title, p.product_type, p.tags, p.created_at, p.updated_at
		FROM new_links l
		JOIN new_outfit o ON o.id = l.outfit_id
		JOIN products p ON p.id = l.product_id
		ORDER BY p.id
	`, userID, params.Name, params.ProductIDs)
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == foreignKeyViolation && pgErr.ConstraintName == outfitProductFKey {
		return models.OutfitResponse{}, fmt.Errorf("create outfit: unknown product: %w", errs.ErrConflict)
	}
	if err != nil {
		return models.OutfitResponse{}, fmt.Errorf("create outfit: %w", err)
	}
	defer func() { _ = rows.Close() }()

	var outfit models.OutfitResponse
	outfit.Products = make([]models.Product, 0, len(params.ProductIDs))
	for rows.Next() {
		var product models.Product
		if err := rows.Scan(
			&outfit.ID,
			&outfit.UserID,
			&outfit.Name,
			&outfit.CreatedAt,
			&outfit.UpdatedAt,
			&product.ID,
			&product.ShopifyID,
			&product.Handle,
			&product.Title,
			&product.ProductType,
			&product.Tags,
			&product.CreatedAt,
			&product.UpdatedAt,
		); err != nil {
			return models.OutfitResponse{}, fmt.Errorf("scan created outfit: %w", err)
		}
		outfit.Products = append(outfit.Products, product)
	}
	if err := rows.Err(); err != nil {
		return models.OutfitResponse{}, fmt.Errorf("iterate created outfit: %w", err)
	}
	return outfit, nil
}

func (r *outfitRepository) GetByID(ctx context.Context, id uuid.UUID) (models.OutfitResponse, error) {
	var outfit models.OutfitResponse
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
		return models.OutfitResponse{}, fmt.Errorf("find outfit %s: %w", id, errs.ErrNotFound)
	}
	if err != nil {
		return models.OutfitResponse{}, fmt.Errorf("find outfit %s: %w", id, err)
	}

	outfit.Products, err = r.findOutfitProducts(ctx, id)
	if err != nil {
		return models.OutfitResponse{}, err
	}
	return outfit, nil
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
		// text[] scans into []string.
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
			return nil, fmt.Errorf("scan outfit product: %w", err)
		}
		products = append(products, product)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate outfit products: %w", err)
	}
	return products, nil
}
