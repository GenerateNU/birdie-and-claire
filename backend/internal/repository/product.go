package repository

import (
	"context"
	"database/sql"
	"fmt"

	"birdie-and-claire/internal/models"

	"github.com/pgvector/pgvector-go"
)

type ProductRepository interface {
	FindSimilar(ctx context.Context, embedding []float32, limit int) ([]models.Product, error)
}

var _ ProductRepository = (*productRepository)(nil)

type productRepository struct {
	db *sql.DB
}

func NewProductRepository(database *sql.DB) ProductRepository {
	return &productRepository{db: database}
}

func (r *productRepository) FindSimilar(ctx context.Context, embedding []float32, limit int) ([]models.Product, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT `+productColumns+`
		FROM products p
		WHERE p.embedding IS NOT NULL
		-- <=> is pgvector's cosine distance, so smaller means more similar.
		ORDER BY p.embedding <=> $1, p.id
		LIMIT $2
	`, pgvector.NewVector(embedding), limit)
	if err != nil {
		return nil, fmt.Errorf("find similar products: %w", err)
	}
	defer func() { _ = rows.Close() }()

	products := make([]models.Product, 0)
	for rows.Next() {
		var product models.Product
		if err := rows.Scan(productScanTargets(&product)...); err != nil {
			return nil, fmt.Errorf("scan similar product: %w", err)
		}
		products = append(products, product)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate similar products: %w", err)
	}
	return products, nil
}

const productColumns = "p.id, p.shopify_id, p.handle, p.title, p.product_type, p.tags, p.created_at, p.updated_at"

// productScanTargets scans productColumns, in order.
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
