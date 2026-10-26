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

// Create's statement can raise 23503 on several keys; these two are the client's fault.
const (
	outfitProductFKey = "outfit_products_product_id_fkey"
	outfitUserFKey    = "outfits_user_id_fkey"
)

type OutfitRepository interface {
	Create(ctx context.Context, params models.CreateOutfitParams, userID uuid.UUID) (models.Outfit, []models.ProductResponse, error)
	GetByID(ctx context.Context, id uuid.UUID, userID uuid.UUID) (models.Outfit, []models.ProductResponse, error)
	GetShared(ctx context.Context, id uuid.UUID) (models.Outfit, []models.ProductResponse, error)
	Share(ctx context.Context, id uuid.UUID, userID uuid.UUID) error
	Unshare(ctx context.Context, id uuid.UUID, userID uuid.UUID) error
	List(ctx context.Context, userID uuid.UUID, params pagination.CursorParams) ([]models.Outfit, error)
}

type outfitRepository struct {
	db *sql.DB
}

func NewOutfitRepository(database *sql.DB) OutfitRepository {
	return &outfitRepository{db: database}
}

func (r *outfitRepository) Create(ctx context.Context, params models.CreateOutfitParams, userID uuid.UUID) (models.Outfit, []models.ProductResponse, error) {
	rows, err := r.db.QueryContext(ctx, `
		WITH new_outfit AS (
			INSERT INTO outfits (user_id, name)
			VALUES ($1, $2)
			RETURNING id, user_id, name, shared_at, created_at, updated_at
		), new_outfit_products AS (
			INSERT INTO outfit_products (outfit_id, product_id)
			SELECT new_outfit.id, unnest($3::uuid[]) FROM new_outfit
			RETURNING outfit_id, product_id
		)
		SELECT o.id, o.user_id, o.name, o.shared_at, o.created_at, o.updated_at,
			p.id, p.shopify_id, p.handle, p.title, p.product_type, p.slot, p.tags, p.created_at, p.updated_at,
			first_image.url
		-- A WITH's parts share one snapshot, so the outfit_products table can't see these rows yet.
		FROM new_outfit_products op
		JOIN new_outfit o ON o.id = op.outfit_id
		JOIN products p ON p.id = op.product_id
		LEFT JOIN LATERAL (
			SELECT pi.url
			FROM product_images pi
			WHERE pi.product_id = p.id
			ORDER BY pi.position, pi.id
			LIMIT 1
		) first_image ON true
		ORDER BY p.id
	`, userID, params.Name, params.ProductIDs)
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == foreignKeyViolation && pgErr.ConstraintName == outfitProductFKey {
		return models.Outfit{}, nil, fmt.Errorf("create outfit: unknown product: %w", errs.ErrConflict)
	}
	if errors.As(err, &pgErr) && pgErr.Code == foreignKeyViolation && pgErr.ConstraintName == outfitUserFKey {
		return models.Outfit{}, nil, fmt.Errorf("create outfit: unknown user %s: %w", userID, errs.ErrNotFound)
	}
	if err != nil {
		return models.Outfit{}, nil, fmt.Errorf("create outfit: %w", err)
	}
	defer func() { _ = rows.Close() }()

	var outfit models.Outfit
	products := make([]models.ProductResponse, 0, len(params.ProductIDs))
	for rows.Next() {
		var product models.ProductResponse
		targets := []any{&outfit.ID, &outfit.UserID, &outfit.Name, &outfit.SharedAt, &outfit.CreatedAt, &outfit.UpdatedAt}
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

// GetByID returns ErrNotFound for an outfit userID does not own, so a caller
// cannot tell someone else's outfit from a missing one.
func (r *outfitRepository) GetByID(ctx context.Context, id uuid.UUID, userID uuid.UUID) (models.Outfit, []models.ProductResponse, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT o.id, o.user_id, o.name, o.shared_at, o.created_at, o.updated_at,
			p.id, p.shopify_id, p.handle, p.title, p.product_type, p.slot, p.tags, p.created_at, p.updated_at,
			first_image.url
		FROM outfits o
		LEFT JOIN outfit_products op ON op.outfit_id = o.id
		LEFT JOIN products p ON p.id = op.product_id
		LEFT JOIN LATERAL (
			SELECT pi.url
			FROM product_images pi
			WHERE pi.product_id = p.id
			ORDER BY pi.position, pi.id
			LIMIT 1
		) first_image ON true
		WHERE o.id = $1 AND o.user_id = $2
		ORDER BY p.id
	`, id, userID)
	if err != nil {
		return models.Outfit{}, nil, fmt.Errorf("get outfit %s: %w", id, err)
	}
	defer func() { _ = rows.Close() }()

	outfit, products, err := scanOutfitWithProducts(rows)
	if err != nil {
		return models.Outfit{}, nil, fmt.Errorf("get outfit %s: %w", id, err)
	}
	return outfit, products, nil
}

// GetShared returns ErrNotFound for a private outfit as well as a missing one.
func (r *outfitRepository) GetShared(ctx context.Context, id uuid.UUID) (models.Outfit, []models.ProductResponse, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT o.id, o.user_id, o.name, o.shared_at, o.created_at, o.updated_at,
			p.id, p.shopify_id, p.handle, p.title, p.product_type, p.slot, p.tags, p.created_at, p.updated_at,
			first_image.url
		FROM outfits o
		LEFT JOIN outfit_products op ON op.outfit_id = o.id
		LEFT JOIN products p ON p.id = op.product_id
		LEFT JOIN LATERAL (
			SELECT pi.url
			FROM product_images pi
			WHERE pi.product_id = p.id
			ORDER BY pi.position, pi.id
			LIMIT 1
		) first_image ON true
		WHERE o.id = $1 AND o.shared_at IS NOT NULL
		ORDER BY p.id
	`, id)
	if err != nil {
		return models.Outfit{}, nil, fmt.Errorf("get shared outfit %s: %w", id, err)
	}
	defer func() { _ = rows.Close() }()

	outfit, products, err := scanOutfitWithProducts(rows)
	if err != nil {
		return models.Outfit{}, nil, fmt.Errorf("get shared outfit %s: %w", id, err)
	}
	return outfit, products, nil
}

// Share keeps the first shared_at on a repeat call, so sharing twice changes nothing.
func (r *outfitRepository) Share(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	var shared uuid.UUID
	err := r.db.QueryRowContext(ctx, `
		UPDATE outfits
		SET shared_at = COALESCE(shared_at, now())
		WHERE id = $1 AND user_id = $2
		RETURNING id
	`, id, userID).Scan(&shared)
	if errors.Is(err, sql.ErrNoRows) {
		return errs.ErrNotFound
	}
	if err != nil {
		return fmt.Errorf("share outfit %s: %w", id, err)
	}
	return nil
}

// Unshare succeeds on an outfit that is already private, so a retried call does not fail.
func (r *outfitRepository) Unshare(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	var unshared uuid.UUID
	err := r.db.QueryRowContext(ctx, `
		UPDATE outfits
		SET shared_at = NULL
		WHERE id = $1 AND user_id = $2
		RETURNING id
	`, id, userID).Scan(&unshared)
	if errors.Is(err, sql.ErrNoRows) {
		return errs.ErrNotFound
	}
	if err != nil {
		return fmt.Errorf("unshare outfit %s: %w", id, err)
	}
	return nil
}

// List returns up to params.Limit+1 of the user's outfits, newest first, so the caller can tell if more remain.
func (r *outfitRepository) List(ctx context.Context, userID uuid.UUID, params pagination.CursorParams) ([]models.Outfit, error) {
	afterCreatedAt, err := params.After().Time("created_at")
	if err != nil {
		return nil, fmt.Errorf("list outfits for user %s: after cursor created_at: %w", userID, err)
	}
	afterID, err := params.After().UUID("id")
	if err != nil {
		return nil, fmt.Errorf("list outfits for user %s: after cursor id: %w", userID, err)
	}

	// No products join: under LIMIT it would count joined rows, not outfits.
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, user_id, name, shared_at, created_at, updated_at
		FROM outfits
		WHERE user_id = $1
			AND ($2::timestamptz IS NULL OR (created_at, id) < ($2::timestamptz, $3::uuid))
		ORDER BY created_at DESC, id DESC
		LIMIT $4
	`, userID, afterCreatedAt, afterID, params.Limit+1)
	if err != nil {
		return nil, fmt.Errorf("list outfits for user %s: %w", userID, err)
	}
	defer func() { _ = rows.Close() }()

	// Non-nil so an empty page encodes as [] rather than null.
	outfits := make([]models.Outfit, 0, params.Limit+1)
	for rows.Next() {
		var outfit models.Outfit
		if err := rows.Scan(&outfit.ID, &outfit.UserID, &outfit.Name, &outfit.SharedAt, &outfit.CreatedAt, &outfit.UpdatedAt); err != nil {
			return nil, fmt.Errorf("list outfits for user %s: scan: %w", userID, err)
		}
		outfits = append(outfits, outfit)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list outfits for user %s: iterate: %w", userID, err)
	}
	return outfits, nil
}

// productScanTargets matches the p.id through first_image.url column order Create selects.
func productScanTargets(product *models.ProductResponse) []any {
	return []any{
		&product.ID,
		&product.ShopifyID,
		&product.Handle,
		&product.Title,
		&product.ProductType,
		&product.Slot,
		// text[] scans into []string.
		&product.Tags,
		&product.CreatedAt,
		&product.UpdatedAt,
		&product.ImageURL,
	}
}

// scanOutfitWithProducts reads the o.id through o.updated_at, then p.id through
// first_image.url, columns GetByID and GetShared select, one row per product.
// It returns ErrNotFound when there are no rows.
func scanOutfitWithProducts(rows *sql.Rows) (models.Outfit, []models.ProductResponse, error) {
	var outfit models.Outfit
	found := false
	products := make([]models.ProductResponse, 0)
	for rows.Next() {
		found = true
		var (
			productID             uuid.NullUUID
			shopifyID             sql.NullInt64
			handle, title, slot   sql.NullString
			productType, imageURL *string
			tags                  []string
			createdAt, updatedAt  sql.NullTime
		)
		if err := rows.Scan(
			&outfit.ID,
			&outfit.UserID,
			&outfit.Name,
			&outfit.SharedAt,
			&outfit.CreatedAt,
			&outfit.UpdatedAt,
			&productID,
			&shopifyID,
			&handle,
			&title,
			&productType,
			&slot,
			&tags,
			&createdAt,
			&updatedAt,
			&imageURL,
		); err != nil {
			return models.Outfit{}, nil, fmt.Errorf("scan: %w", err)
		}
		// A NULL product id is the LEFT JOIN's row for an outfit with no products.
		if !productID.Valid {
			continue
		}
		products = append(products, models.ProductResponse{
			Product: models.Product{
				ID:          productID.UUID,
				ShopifyID:   shopifyID.Int64,
				Handle:      handle.String,
				Title:       title.String,
				ProductType: productType,
				Slot:        models.ProductSlot(slot.String),
				Tags:        tags,
				CreatedAt:   createdAt.Time,
				UpdatedAt:   updatedAt.Time,
			},
			ImageURL: imageURL,
		})
	}
	if err := rows.Err(); err != nil {
		return models.Outfit{}, nil, fmt.Errorf("iterate: %w", err)
	}
	if !found {
		return models.Outfit{}, nil, errs.ErrNotFound
	}
	return outfit, products, nil
}
