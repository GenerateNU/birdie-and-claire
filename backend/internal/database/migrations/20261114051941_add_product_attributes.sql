-- +goose Up
-- What the catalog sync's LLM read off a product's photo and store data. NULL until the sync labels it, and for good
-- on demo products, which the sync never touches.
ALTER TABLE products ADD COLUMN attributes JSONB;
-- A hash of what the stored attributes were labeled from. NULL means the next sync labels the product again.
ALTER TABLE products ADD COLUMN attributes_hash TEXT;

-- +goose Down
ALTER TABLE products DROP COLUMN attributes_hash;
ALTER TABLE products DROP COLUMN attributes;
