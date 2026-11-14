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
	GetShared(ctx context.Context, id uuid.UUID) (models.Outfit, string, []models.ProductResponse, error)
	Update(ctx context.Context, id uuid.UUID, params models.UpdateOutfitParams, userID uuid.UUID) (models.Outfit, []models.ProductResponse, error)
	Delete(ctx context.Context, id uuid.UUID, userID uuid.UUID) error
	Share(ctx context.Context, id uuid.UUID, userID uuid.UUID) error
	Unshare(ctx context.Context, id uuid.UUID, userID uuid.UUID) error
	List(ctx context.Context, userID uuid.UUID, params pagination.CursorParams) (outfits []models.OutfitResponse, total int, err error)
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
			INSERT INTO outfits (user_id, name, description, tags)
			VALUES ($1, $2, $4, COALESCE($5::text[], '{}'))
			RETURNING id, user_id, name, description, tags, shared_at, created_at, updated_at
		), new_outfit_products AS (
			INSERT INTO outfit_products (outfit_id, product_id)
			SELECT new_outfit.id, unnest($3::uuid[]) FROM new_outfit
			RETURNING outfit_id, product_id
		)
		SELECT o.id, o.user_id, o.name, o.description, o.tags, o.shared_at, o.created_at, o.updated_at,
			p.id, p.shopify_id, p.handle, p.title, p.product_type, p.slot, p.source, p.tags, p.created_at, p.updated_at,
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
		-- Head to toe, the order the outfit pages list pieces in.
		ORDER BY array_position(ARRAY['top', 'one_piece', 'bottom', 'shoe', 'accessory']::product_slot[], p.slot), p.id
	`, userID, params.Name, params.ProductIDs, params.Description, params.Tags)
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
		targets := []any{&outfit.ID, &outfit.UserID, &outfit.Name, &outfit.Description, &outfit.Tags, &outfit.SharedAt, &outfit.CreatedAt, &outfit.UpdatedAt}
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
	return getOutfitByID(ctx, r.db, id, userID)
}

// querier is satisfied by both *sql.DB and *sql.Tx, so Update can read its result inside its transaction.
type querier interface {
	QueryContext(ctx context.Context, query string, args ...any) (*sql.Rows, error)
}

func getOutfitByID(ctx context.Context, dbOrTx querier, id uuid.UUID, userID uuid.UUID) (models.Outfit, []models.ProductResponse, error) {
	rows, err := dbOrTx.QueryContext(ctx, `
		SELECT o.id, o.user_id, o.name, o.description, o.tags, o.shared_at, o.created_at, o.updated_at,
			p.id, p.shopify_id, p.handle, p.title, p.product_type, p.slot, p.source, p.tags, p.created_at, p.updated_at,
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
		-- Head to toe, the order the outfit pages list pieces in. array_position is NULL for the
		-- LEFT JOIN's empty-outfit row, which then sorts last.
		ORDER BY array_position(ARRAY['top', 'one_piece', 'bottom', 'shoe', 'accessory']::product_slot[], p.slot), p.id
	`, id, userID)
	if err != nil {
		return models.Outfit{}, nil, fmt.Errorf("get outfit %s: %w", id, err)
	}
	defer func() { _ = rows.Close() }()

	outfit, _, products, err := scanOutfitWithProducts(rows, false)
	if err != nil {
		return models.Outfit{}, nil, fmt.Errorf("get outfit %s: %w", id, err)
	}
	return outfit, products, nil
}

func (r *outfitRepository) Update(ctx context.Context, id uuid.UUID, params models.UpdateOutfitParams, userID uuid.UUID) (models.Outfit, []models.ProductResponse, error) {
	// One transaction, so a failure part-way leaves the outfit untouched.
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return models.Outfit{}, nil, fmt.Errorf("update outfit %s: begin: %w", id, err)
	}
	// Rollback after a successful Commit is a no-op, so its error is ignored on purpose.
	defer func() { _ = tx.Rollback() }()

	// Verifies the outfit exists and is userID's, and locks its row so concurrent updates run one at a time.
	var updated uuid.UUID
	err = tx.QueryRowContext(ctx, `
		UPDATE outfits
		SET name = COALESCE(NULLIF($3, ''), name),
			description = COALESCE($4::text, description),
			tags = COALESCE($5::text[], tags),
			updated_at = now()
		WHERE id = $1 AND user_id = $2
		RETURNING id
	`, id, userID, params.Name, params.Description, params.Tags).Scan(&updated)
	if errors.Is(err, sql.ErrNoRows) {
		return models.Outfit{}, nil, errs.ErrNotFound
	}
	if err != nil {
		return models.Outfit{}, nil, fmt.Errorf("update outfit %s: %w", id, err)
	}

	// An empty list would delete every product (product_id <> ALL('{}') is true for every row).
	if len(params.ProductIDs) > 0 {
		// Kept rows are neither deleted nor reinserted, so the two writes touch disjoint rows and can share a snapshot.
		_, err = tx.ExecContext(ctx, `
			WITH removed AS (
				DELETE FROM outfit_products
				WHERE outfit_id = $1 AND product_id <> ALL($2::uuid[])
			)
			INSERT INTO outfit_products (outfit_id, product_id)
			SELECT $1, unnest($2::uuid[])
			ON CONFLICT DO NOTHING
		`, id, params.ProductIDs)
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == foreignKeyViolation && pgErr.ConstraintName == outfitProductFKey {
			return models.Outfit{}, nil, fmt.Errorf("update outfit %s: unknown product: %w", id, errs.ErrConflict)
		}
		if err != nil {
			return models.Outfit{}, nil, fmt.Errorf("update outfit %s: replace products: %w", id, err)
		}
	}

	outfit, products, err := getOutfitByID(ctx, tx, id, userID)
	if err != nil {
		return models.Outfit{}, nil, fmt.Errorf("update outfit %s: read back: %w", id, err)
	}
	if err := tx.Commit(); err != nil {
		return models.Outfit{}, nil, fmt.Errorf("update outfit %s: commit: %w", id, err)
	}
	return outfit, products, nil
}

// Delete returns ErrNotFound for an outfit userID does not own. The outfit's
// products and reactions go with it through ON DELETE CASCADE.
func (r *outfitRepository) Delete(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	var deleted uuid.UUID
	err := r.db.QueryRowContext(ctx, `
		DELETE FROM outfits
		WHERE id = $1 AND user_id = $2
		RETURNING id
	`, id, userID).Scan(&deleted)
	if errors.Is(err, sql.ErrNoRows) {
		return errs.ErrNotFound
	}
	if err != nil {
		return fmt.Errorf("delete outfit %s: %w", id, err)
	}
	return nil
}

// GetShared returns ErrNotFound for a private outfit as well as a missing one.
func (r *outfitRepository) GetShared(ctx context.Context, id uuid.UUID) (models.Outfit, string, []models.ProductResponse, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT o.id, o.user_id, o.name, o.description, o.tags, o.shared_at, o.created_at, o.updated_at, COALESCE(u.name, ''),
			p.id, p.shopify_id, p.handle, p.title, p.product_type, p.slot, p.source, p.tags, p.created_at, p.updated_at,
			first_image.url
		FROM outfits o
		JOIN users u ON u.id = o.user_id
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
		-- Head to toe, the order the outfit pages list pieces in. array_position is NULL for the
		-- LEFT JOIN's empty-outfit row, which then sorts last.
		ORDER BY array_position(ARRAY['top', 'one_piece', 'bottom', 'shoe', 'accessory']::product_slot[], p.slot), p.id
	`, id)
	if err != nil {
		return models.Outfit{}, "", nil, fmt.Errorf("get shared outfit %s: %w", id, err)
	}
	defer func() { _ = rows.Close() }()

	outfit, ownerName, products, err := scanOutfitWithProducts(rows, true)
	if err != nil {
		return models.Outfit{}, "", nil, fmt.Errorf("get shared outfit %s: %w", id, err)
	}
	return outfit, ownerName, products, nil
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

// List returns up to params.Limit+1 of the user's outfits with their products, newest first, so the caller can tell
// if more remain, and how many outfits the user has in all.
func (r *outfitRepository) List(ctx context.Context, userID uuid.UUID, params pagination.CursorParams) ([]models.OutfitResponse, int, error) {
	afterCreatedAt, err := params.After().Time("created_at")
	if err != nil {
		return nil, 0, fmt.Errorf("list outfits for user %s: after cursor created_at: %w", userID, err)
	}
	afterID, err := params.After().UUID("id")
	if err != nil {
		return nil, 0, fmt.Errorf("list outfits for user %s: after cursor id: %w", userID, err)
	}

	// outfit_page picks the page before products join on, because LIMIT counts rows and a join would count products.
	// An empty page reports total 0, which is only wrong past the last page, and callers stop at has_more = false.
	rows, err := r.db.QueryContext(ctx, `
		WITH user_outfits AS (
			SELECT id, user_id, name, description, tags, shared_at, created_at, updated_at, count(*) OVER () AS total
			FROM outfits
			WHERE user_id = $1
		), outfit_page AS (
			SELECT id, user_id, name, description, tags, shared_at, created_at, updated_at, total
			FROM user_outfits
			WHERE $2::timestamptz IS NULL OR (created_at, id) < ($2::timestamptz, $3::uuid)
			ORDER BY created_at DESC, id DESC
			LIMIT $4
		)
		SELECT o.id, o.user_id, o.name, o.description, o.tags, o.shared_at, o.created_at, o.updated_at, o.total,
			p.id, p.shopify_id, p.handle, p.title, p.product_type, p.slot, p.source, p.tags, p.created_at, p.updated_at,
			first_image.url
		FROM outfit_page o
		LEFT JOIN outfit_products op ON op.outfit_id = o.id
		LEFT JOIN products p ON p.id = op.product_id
		LEFT JOIN LATERAL (
			SELECT pi.url
			FROM product_images pi
			WHERE pi.product_id = p.id
			ORDER BY pi.position, pi.id
			LIMIT 1
		) first_image ON true
		-- Outfits stay newest first and together, and each one's products run head to toe, the order its page lists them in.
		ORDER BY o.created_at DESC, o.id DESC,
			array_position(ARRAY['top', 'one_piece', 'bottom', 'shoe', 'accessory']::product_slot[], p.slot), p.id
	`, userID, afterCreatedAt, afterID, params.Limit+1)
	if err != nil {
		return nil, 0, fmt.Errorf("list outfits for user %s: %w", userID, err)
	}
	defer func() { _ = rows.Close() }()

	var total int
	// Non-nil so an empty page encodes as [] rather than null.
	outfits := make([]models.OutfitResponse, 0, params.Limit+1)
	for rows.Next() {
		var outfit models.Outfit
		var product productColumns
		scanTargets := append([]any{
			&outfit.ID, &outfit.UserID, &outfit.Name, &outfit.Description, &outfit.Tags, &outfit.SharedAt, &outfit.CreatedAt, &outfit.UpdatedAt, &total,
		}, product.targets()...)
		if err := rows.Scan(scanTargets...); err != nil {
			return nil, 0, fmt.Errorf("list outfits for user %s: scan: %w", userID, err)
		}
		// The ORDER BY keeps each outfit's rows together, so an ID that differs from the last one starts the next outfit.
		if len(outfits) == 0 || outfits[len(outfits)-1].ID != outfit.ID {
			// Non-nil so an outfit with no products encodes as [] rather than null.
			outfits = append(outfits, models.OutfitResponse{Outfit: outfit, Products: make([]models.ProductResponse, 0)})
		}
		if response, ok := product.response(); ok {
			last := &outfits[len(outfits)-1]
			last.Products = append(last.Products, response)
		}
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("list outfits for user %s: iterate: %w", userID, err)
	}
	return outfits, total, nil
}

// productColumns scans the p.id through first_image.url columns the outfit queries select. Every column is NULL on
// the LEFT JOIN's row for an outfit with no products.
type productColumns struct {
	id                    uuid.NullUUID
	shopifyID             sql.NullInt64
	handle, title         sql.NullString
	slot, source          sql.NullString
	productType, imageURL *string
	tags                  []string
	createdAt, updatedAt  sql.NullTime
}

func (c *productColumns) targets() []any {
	return []any{&c.id, &c.shopifyID, &c.handle, &c.title, &c.productType, &c.slot, &c.source, &c.tags, &c.createdAt, &c.updatedAt, &c.imageURL}
}

// response reports false for the row of an outfit with no products.
func (c *productColumns) response() (models.ProductResponse, bool) {
	if !c.id.Valid {
		return models.ProductResponse{}, false
	}
	return models.ProductResponse{
		Product: models.Product{
			ID:          c.id.UUID,
			ShopifyID:   c.shopifyID.Int64,
			Handle:      c.handle.String,
			Title:       c.title.String,
			ProductType: c.productType,
			Slot:        models.ProductSlot(c.slot.String),
			Source:      models.ProductSource(c.source.String),
			Tags:        c.tags,
			CreatedAt:   c.createdAt.Time,
			UpdatedAt:   c.updatedAt.Time,
		},
		ImageURL: c.imageURL,
	}, true
}

// scanOutfitWithProducts reads the o.id through o.updated_at, then p.id through
// first_image.url, columns GetByID and GetShared select, one row per product.
// It returns ErrNotFound when there are no rows.
func scanOutfitWithProducts(rows *sql.Rows, includeOwner bool) (models.Outfit, string, []models.ProductResponse, error) {
	var outfit models.Outfit
	var ownerName string
	found := false
	products := make([]models.ProductResponse, 0)
	for rows.Next() {
		found = true
		var product productColumns
		scanTargets := []any{
			&outfit.ID,
			&outfit.UserID,
			&outfit.Name,
			&outfit.Description,
			&outfit.Tags,
			&outfit.SharedAt,
			&outfit.CreatedAt,
			&outfit.UpdatedAt,
		}
		if includeOwner {
			scanTargets = append(scanTargets, &ownerName)
		}
		if err := rows.Scan(append(scanTargets, product.targets()...)...); err != nil {
			return models.Outfit{}, "", nil, fmt.Errorf("scan: %w", err)
		}
		if response, ok := product.response(); ok {
			products = append(products, response)
		}
	}
	if err := rows.Err(); err != nil {
		return models.Outfit{}, "", nil, fmt.Errorf("iterate: %w", err)
	}
	if !found {
		return models.Outfit{}, "", nil, errs.ErrNotFound
	}
	return outfit, ownerName, products, nil
}
