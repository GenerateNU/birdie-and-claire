-- +goose Up
ALTER TABLE products ADD COLUMN slot TEXT;

-- +goose Down
ALTER TABLE products DROP COLUMN slot;
