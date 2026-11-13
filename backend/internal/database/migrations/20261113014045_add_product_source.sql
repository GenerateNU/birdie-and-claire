-- +goose Up
-- Where a product comes from. The Shopify sync manages only birdie_and_claire rows. demo rows are the seeded
-- catalog, kept as filler until basics replace them (docs/Basics_Research.md).
CREATE TYPE product_source AS ENUM ('birdie_and_claire', 'demo');
ALTER TABLE products ADD COLUMN source product_source NOT NULL DEFAULT 'demo';
-- Real Shopify IDs have 13 digits, and every seeded one is under 100,000.
UPDATE products SET source = 'birdie_and_claire' WHERE shopify_id >= 1000000000;
-- The store fills the top and accessory slots, so only the demo shoes and bottoms stay recommendable.
UPDATE products SET active = false, updated_at = now() WHERE active AND source = 'demo' AND slot IN ('top', 'accessory');

-- +goose Down
ALTER TABLE products DROP COLUMN source;
DROP TYPE product_source;
