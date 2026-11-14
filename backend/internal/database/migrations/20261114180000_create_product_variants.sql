-- +goose Up
-- Product variants mirrored from Shopify. The cart link uses the available
-- variant with the lowest position.
CREATE TABLE product_variants (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shopify_id   BIGINT NOT NULL UNIQUE,
    product_id   UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    available    BOOLEAN NOT NULL,
    position     INTEGER NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_variants_product_id ON product_variants(product_id);

-- +goose Down
DROP TABLE product_variants;
