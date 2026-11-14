package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"birdie-and-claire/internal/errs"
	"birdie-and-claire/internal/models"

	"github.com/google/uuid"
)

type CollectionRepository interface {
	Create(ctx context.Context, params models.CreateCollectionParams, userID uuid.UUID) (models.CollectionResponse, error)
	List(ctx context.Context, userID uuid.UUID) ([]models.CollectionResponse, error)
	GetByID(ctx context.Context, id uuid.UUID, userID uuid.UUID) (models.CollectionDetailResponse, error)
	Update(ctx context.Context, id uuid.UUID, params models.UpdateCollectionParams, userID uuid.UUID) (models.CollectionResponse, error)
	Delete(ctx context.Context, id uuid.UUID, userID uuid.UUID) error
}

type collectionRepository struct {
	db *sql.DB
}

func NewCollectionRepository(database *sql.DB) CollectionRepository {
	return &collectionRepository{db: database}
}

func (r *collectionRepository) Create(ctx context.Context, params models.CreateCollectionParams, userID uuid.UUID) (models.CollectionResponse, error) {
	collection := models.CollectionResponse{ThumbnailURLs: []string{}}
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO collections (user_id, name, description)
		VALUES ($1, $2, $3)
		RETURNING id, name, description
	`, userID, params.Name, params.Description).Scan(&collection.ID, &collection.Name, &collection.Description)
	if err != nil {
		return models.CollectionResponse{}, fmt.Errorf("create collection for user %s: %w", userID, err)
	}
	return collection, nil
}

func (r *collectionRepository) List(ctx context.Context, userID uuid.UUID) ([]models.CollectionResponse, error) {
	collections, err := r.listSummaries(ctx, userID, nil)
	if err != nil {
		return nil, fmt.Errorf("list collections for user %s: %w", userID, err)
	}
	return collections, nil
}

// listSummaries reads every collection of userID, or only the one with id when id is not nil.
func (r *collectionRepository) listSummaries(ctx context.Context, userID uuid.UUID, id *uuid.UUID) ([]models.CollectionResponse, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT c.id, c.name, c.description,
			(SELECT count(*) FROM collection_outfits co WHERE co.collection_id = c.id),
			COALESCE(thumbnails.urls, '{}')
		FROM collections c
		LEFT JOIN LATERAL (
			-- The LIMIT picks the 4 newest outfits before the join drops those with no image, so an outfit without one
			-- leaves a gap instead of letting an older outfit take its place.
			SELECT array_agg(first_piece.url ORDER BY recent.created_at DESC, recent.outfit_id DESC) AS urls
			FROM (
				SELECT co.created_at, co.outfit_id
				FROM collection_outfits co
				WHERE co.collection_id = c.id
				ORDER BY co.created_at DESC, co.outfit_id DESC
				LIMIT 4
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
				ORDER BY array_position(ARRAY['top', 'one_piece', 'bottom', 'shoe', 'accessory']::product_slot[], p.slot), p.id
				LIMIT 1
			) first_piece ON true
		) thumbnails ON true
		WHERE c.user_id = $1 AND ($2::uuid IS NULL OR c.id = $2)
		ORDER BY c.created_at DESC, c.id DESC
	`, userID, id)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()

	// Non-nil so no collections encodes as [] rather than null.
	collections := make([]models.CollectionResponse, 0)
	for rows.Next() {
		var collection models.CollectionResponse
		if err := rows.Scan(&collection.ID, &collection.Name, &collection.Description, &collection.OutfitCount, &collection.ThumbnailURLs); err != nil {
			return nil, fmt.Errorf("scan: %w", err)
		}
		collections = append(collections, collection)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate: %w", err)
	}
	return collections, nil
}

// GetByID returns ErrNotFound for a collection userID does not own, so a caller cannot tell someone else's
// collection from a missing one.
func (r *collectionRepository) GetByID(ctx context.Context, id uuid.UUID, userID uuid.UUID) (models.CollectionDetailResponse, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT c.id, c.name, c.description,
			o.id, o.user_id, o.name, o.description, o.tags, o.shared_at, o.created_at, o.updated_at,
			p.id, p.shopify_id, p.handle, p.title, p.product_type, p.slot, p.source, p.tags, p.created_at, p.updated_at,
			first_image.url
		FROM collections c
		LEFT JOIN collection_outfits co ON co.collection_id = c.id
		LEFT JOIN outfits o ON o.id = co.outfit_id
		LEFT JOIN outfit_products op ON op.outfit_id = o.id
		LEFT JOIN products p ON p.id = op.product_id
		LEFT JOIN LATERAL (
			SELECT pi.url
			FROM product_images pi
			WHERE pi.product_id = p.id
			ORDER BY pi.position, pi.id
			LIMIT 1
		) first_image ON true
		WHERE c.id = $1 AND c.user_id = $2
		-- Outfits stay newest added first and together, and each one's products run head to toe.
		ORDER BY co.created_at DESC, co.outfit_id DESC,
			array_position(ARRAY['top', 'one_piece', 'bottom', 'shoe', 'accessory']::product_slot[], p.slot), p.id
	`, id, userID)
	if err != nil {
		return models.CollectionDetailResponse{}, fmt.Errorf("get collection %s: %w", id, err)
	}
	defer func() { _ = rows.Close() }()

	found := false
	// Non-nil so a collection with no outfits encodes as [] rather than null.
	collection := models.CollectionDetailResponse{Outfits: []models.OutfitResponse{}}
	for rows.Next() {
		found = true
		// Every outfit column is NULL on the LEFT JOIN's row for an empty collection.
		var outfitID, outfitUserID uuid.NullUUID
		var outfitName, outfitDescription sql.NullString
		var outfitTags []string
		var outfit models.Outfit
		var outfitCreatedAt, outfitUpdatedAt sql.NullTime
		var product productColumns
		scanTargets := append([]any{
			&collection.ID, &collection.Name, &collection.Description,
			&outfitID, &outfitUserID, &outfitName, &outfitDescription, &outfitTags, &outfit.SharedAt, &outfitCreatedAt, &outfitUpdatedAt,
		}, product.targets()...)
		if err := rows.Scan(scanTargets...); err != nil {
			return models.CollectionDetailResponse{}, fmt.Errorf("get collection %s: scan: %w", id, err)
		}
		if !outfitID.Valid {
			continue
		}

		// The ORDER BY keeps each outfit's rows together, so an ID that differs from the last one starts the next outfit.
		if len(collection.Outfits) == 0 || collection.Outfits[len(collection.Outfits)-1].ID != outfitID.UUID {
			outfit.ID = outfitID.UUID
			outfit.UserID = outfitUserID.UUID
			outfit.Name = outfitName.String
			outfit.Description = outfitDescription.String
			outfit.Tags = outfitTags
			outfit.CreatedAt = outfitCreatedAt.Time
			outfit.UpdatedAt = outfitUpdatedAt.Time
			// Non-nil so an outfit with no products encodes as [] rather than null.
			collection.Outfits = append(collection.Outfits, models.OutfitResponse{Outfit: outfit, Products: []models.ProductResponse{}})
		}
		if response, ok := product.response(); ok {
			last := &collection.Outfits[len(collection.Outfits)-1]
			last.Products = append(last.Products, response)
		}
	}
	if err := rows.Err(); err != nil {
		return models.CollectionDetailResponse{}, fmt.Errorf("get collection %s: iterate: %w", id, err)
	}
	if !found {
		return models.CollectionDetailResponse{}, errs.ErrNotFound
	}
	return collection, nil
}

func (r *collectionRepository) Update(ctx context.Context, id uuid.UUID, params models.UpdateCollectionParams, userID uuid.UUID) (models.CollectionResponse, error) {
	var updated uuid.UUID
	err := r.db.QueryRowContext(ctx, `
		UPDATE collections
		SET name = COALESCE(NULLIF($3, ''), name),
			description = COALESCE($4::text, description),
			updated_at = now()
		WHERE id = $1 AND user_id = $2
		RETURNING id
	`, id, userID, params.Name, params.Description).Scan(&updated)
	if errors.Is(err, sql.ErrNoRows) {
		return models.CollectionResponse{}, errs.ErrNotFound
	}
	if err != nil {
		return models.CollectionResponse{}, fmt.Errorf("update collection %s: %w", id, err)
	}

	collections, err := r.listSummaries(ctx, userID, &id)
	if err != nil {
		return models.CollectionResponse{}, fmt.Errorf("update collection %s: read back: %w", id, err)
	}
	if len(collections) == 0 {
		return models.CollectionResponse{}, errs.ErrNotFound
	}
	return collections[0], nil
}

// Delete returns ErrNotFound for a collection userID does not own. Its outfit links go with it through ON DELETE
// CASCADE, and the outfits stay.
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
