-- +goose Up
-- Product image metadata mirrored from Shopify.
-- One concern: multiple positions might end up at 0 if there missing positions passed in
CREATE TABLE product_images (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shopify_id   BIGINT NOT NULL UNIQUE,
    product_id   UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    url          TEXT NOT NULL,
    alt_text     TEXT,
    width        INTEGER,
    height       INTEGER,
    position     INTEGER NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_images_product_id ON product_images(product_id);

-- +goose Down
DROP TABLE product_images;