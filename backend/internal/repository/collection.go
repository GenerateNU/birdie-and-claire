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
)

// thumbnailCount is how many of a collection's newest outfits get a thumbnail in the collections list.
const thumbnailCount = 4

type CollectionRepository interface {
	Create(ctx context.Context, params models.CreateCollectionParams, userID uuid.UUID) (models.CollectionSummaryResponse, error)
	ListByUser(ctx context.Context, userID uuid.UUID, params pagination.CursorParams) ([]models.CollectionSummaryResponse, error)
	GetByID(ctx context.Context, id uuid.UUID, userID uuid.UUID) (models.Collection, error)
	ListOutfitLinks(ctx context.Context, id uuid.UUID, params pagination.CursorParams) ([]models.CollectionOutfit, error)
	Update(ctx context.Context, id uuid.UUID, params models.UpdateCollectionParams, userID uuid.UUID) (models.Collection, error)
	Delete(ctx context.Context, id uuid.UUID, userID uuid.UUID) error
}

type collectionRepository struct {
	db *sql.DB
}

func NewCollectionRepository(database *sql.DB) CollectionRepository {
	return &collectionRepository{db: database}
}

func (r *collectionRepository) Create(ctx context.Context, params models.CreateCollectionParams, userID uuid.UUID) (models.CollectionSummaryResponse, error) {
	collection := models.CollectionSummaryResponse{ThumbnailURLs: []string{}}
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO collections (user_id, name, description)
		VALUES ($1, $2, $3)
		RETURNING id, name, description, created_at
	`, userID, params.Name, params.Description).Scan(&collection.ID, &collection.Name, &collection.Description, &collection.CreatedAt)
	if err != nil {
		return models.CollectionSummaryResponse{}, fmt.Errorf("create collection for user %s: %w", userID, err)
	}
	return collection, nil
}

// ListByUser returns up to params.Limit+1 of userID's collections, newest first, so the caller can tell if more
// remain.
func (r *collectionRepository) ListByUser(ctx context.Context, userID uuid.UUID, params pagination.CursorParams) ([]models.CollectionSummaryResponse, error) {
	afterCreatedAt, err := params.After().Time("created_at")
	if err != nil {
		return nil, fmt.Errorf("list collections for user %s: after cursor created_at: %w", userID, err)
	}
	afterID, err := params.After().UUID("id")
	if err != nil {
		return nil, fmt.Errorf("list collections for user %s: after cursor id: %w", userID, err)
	}

	rows, err := r.db.QueryContext(ctx, `
		SELECT c.id, c.name, c.description, c.created_at,
			(SELECT count(*) FROM collection_outfits co WHERE co.collection_id = c.id),
			COALESCE(thumbnails.urls, '{}')
		FROM collections c
		LEFT JOIN LATERAL (
			-- The LIMIT picks the newest outfits before the join drops those with no image, so an outfit without one
			-- leaves a gap instead of letting an older outfit take its place.
			SELECT array_agg(first_piece.url ORDER BY recent.created_at DESC, recent.outfit_id DESC) AS urls
			FROM (
				SELECT co.created_at, co.outfit_id
				FROM collection_outfits co
				WHERE co.collection_id = c.id
				ORDER BY co.created_at DESC, co.outfit_id DESC
				LIMIT $5
			) recent
			JOIN LATERAL (
				SELECT first_image.url
				FROM outfit_products op
				JOIN products p ON p.id = op.product_id
				JOIN LATERAL (
					SELECT pi.url
					FROM product_images pi
					WHERE pi.product_id = p.id
					ORDER BY pi.position, pi.id
					LIMIT 1
				) first_image ON true
				WHERE op.outfit_id = recent.outfit_id
				ORDER BY p.slot, p.id
				LIMIT 1
			) first_piece ON true
		) thumbnails ON true
		WHERE c.user_id = $1
			AND ($2::timestamptz IS NULL OR (c.created_at, c.id) < ($2::timestamptz, $3::uuid))
		ORDER BY c.created_at DESC, c.id DESC
		LIMIT $4
	`, userID, afterCreatedAt, afterID, params.Limit+1, thumbnailCount)
	if err != nil {
		return nil, fmt.Errorf("list collections for user %s: %w", userID, err)
	}
	defer func() { _ = rows.Close() }()

	collections := make([]models.CollectionSummaryResponse, 0, params.Limit+1)
	for rows.Next() {
		var collection models.CollectionSummaryResponse
		if err := rows.Scan(&collection.ID, &collection.Name, &collection.Description, &collection.CreatedAt, &collection.OutfitCount, &collection.ThumbnailURLs); err != nil {
			return nil, fmt.Errorf("list collections for user %s: scan: %w", userID, err)
		}
		collections = append(collections, collection)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list collections for user %s: iterate: %w", userID, err)
	}
	return collections, nil
}

// GetByID returns ErrNotFound for a collection userID does not own, so a caller cannot tell someone else's
// collection from a missing one.
func (r *collectionRepository) GetByID(ctx context.Context, id uuid.UUID, userID uuid.UUID) (models.Collection, error) {
	var collection models.Collection
	err := r.db.QueryRowContext(ctx, `
		SELECT id, name, description, created_at
		FROM collections
		WHERE id = $1 AND user_id = $2
	`, id, userID).Scan(&collection.ID, &collection.Name, &collection.Description, &collection.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return models.Collection{}, errs.ErrNotFound
	}
	if err != nil {
		return models.Collection{}, fmt.Errorf("get collection %s: %w", id, err)
	}
	return collection, nil
}

// ListOutfitLinks returns up to params.Limit+1 of the collection's outfit links, newest added first, so the caller
// can tell if more remain. It does not check who owns the collection.
func (r *collectionRepository) ListOutfitLinks(ctx context.Context, id uuid.UUID, params pagination.CursorParams) ([]models.CollectionOutfit, error) {
	afterAddedAt, err := params.After().Time("added_at")
	if err != nil {
		return nil, fmt.Errorf("list outfits of collection %s: after cursor added_at: %w", id, err)
	}
	afterOutfitID, err := params.After().UUID("outfit_id")
	if err != nil {
		return nil, fmt.Errorf("list outfits of collection %s: after cursor outfit_id: %w", id, err)
	}

	rows, err := r.db.QueryContext(ctx, `
		SELECT outfit_id, created_at
		FROM collection_outfits
		WHERE collection_id = $1
			AND ($2::timestamptz IS NULL OR (created_at, outfit_id) < ($2::timestamptz, $3::uuid))
		ORDER BY created_at DESC, outfit_id DESC
		LIMIT $4
	`, id, afterAddedAt, afterOutfitID, params.Limit+1)
	if err != nil {
		return nil, fmt.Errorf("list outfits of collection %s: %w", id, err)
	}
	defer func() { _ = rows.Close() }()

	links := make([]models.CollectionOutfit, 0, params.Limit+1)
	for rows.Next() {
		var link models.CollectionOutfit
		if err := rows.Scan(&link.OutfitID, &link.AddedAt); err != nil {
			return nil, fmt.Errorf("list outfits of collection %s: scan: %w", id, err)
		}
		links = append(links, link)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list outfits of collection %s: iterate: %w", id, err)
	}
	return links, nil
}

func (r *collectionRepository) Update(ctx context.Context, id uuid.UUID, params models.UpdateCollectionParams, userID uuid.UUID) (models.Collection, error) {
	var collection models.Collection
	err := r.db.QueryRowContext(ctx, `
		UPDATE collections
		SET name = COALESCE(NULLIF($3, ''), name),
			description = COALESCE($4::text, description),
			updated_at = now()
		WHERE id = $1 AND user_id = $2
		RETURNING id, name, description, created_at
	`, id, userID, params.Name, params.Description).Scan(&collection.ID, &collection.Name, &collection.Description, &collection.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return models.Collection{}, errs.ErrNotFound
	}
	if err != nil {
		return models.Collection{}, fmt.Errorf("update collection %s: %w", id, err)
	}
	return collection, nil
}

// Delete returns ErrNotFound for a collection userID does not own.
func (r *collectionRepository) Delete(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	var deleted uuid.UUID
	err := r.db.QueryRowContext(ctx, `
		DELETE FROM collections
		WHERE id = $1 AND user_id = $2
		RETURNING id
	`, id, userID).Scan(&deleted)
	if errors.Is(err, sql.ErrNoRows) {
		return errs.ErrNotFound
	}
	if err != nil {
		return fmt.Errorf("delete collection %s: %w", id, err)
	}
	return nil
}
