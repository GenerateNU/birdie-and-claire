-- +goose Up
CREATE TABLE owned_products (
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, product_id)
);

-- Serves the pieces list: "WHERE user_id = ... AND (created_at, product_id) < ... ORDER BY created_at DESC, product_id DESC".
CREATE INDEX idx_owned_products_user_id_created_at_product_id ON owned_products (user_id, created_at DESC, product_id DESC);

-- +goose Down
DROP TABLE owned_products;
