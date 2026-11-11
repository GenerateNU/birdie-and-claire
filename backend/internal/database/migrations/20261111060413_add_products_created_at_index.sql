-- +goose Up
-- Serves the catalog list: "WHERE (created_at, id) < ... ORDER BY created_at DESC, id DESC".
CREATE INDEX idx_products_created_at_id ON products (created_at DESC, id DESC);

-- +goose Down
DROP INDEX idx_products_created_at_id;
