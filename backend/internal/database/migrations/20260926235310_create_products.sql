-- +goose Up
CREATE TABLE products (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shopify_id   BIGINT NOT NULL UNIQUE,
    handle       TEXT NOT NULL,
    title        TEXT NOT NULL,
    product_type TEXT,
    tags         TEXT[] NOT NULL DEFAULT '{}',
    embedding    vector(512),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- +goose Down
DROP TABLE products;
