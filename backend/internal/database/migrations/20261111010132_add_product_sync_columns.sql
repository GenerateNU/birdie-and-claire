-- +goose Up
-- The Shopify sync sets active to false for products that left the store. It
-- never deletes them, because outfit_products still points at them from saved
-- outfits.
ALTER TABLE products ADD COLUMN active BOOLEAN NOT NULL DEFAULT true;
-- A hash of what the stored embedding was built from. NULL means it was not
-- built by the sync, so the next sync embeds the product again.
ALTER TABLE products ADD COLUMN embedding_hash TEXT;

-- +goose Down
ALTER TABLE products DROP COLUMN embedding_hash;
ALTER TABLE products DROP COLUMN active;
