-- +goose Up
-- A finer type inside a product's slot, set by the catalog sync's LLM from lists in Go. NULL until the next sync.
ALTER TABLE products ADD COLUMN secondary_type TEXT;

-- +goose Down
ALTER TABLE products DROP COLUMN secondary_type;
