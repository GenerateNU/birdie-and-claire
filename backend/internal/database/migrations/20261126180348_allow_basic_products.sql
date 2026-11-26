-- +goose Up
-- A basic is a product the store does not sell, so it has no Shopify ID or handle. source = 'basic' marks it.
ALTER TYPE product_source ADD VALUE 'basic';
ALTER TABLE products ALTER COLUMN shopify_id DROP NOT NULL;
ALTER TABLE products ALTER COLUMN handle DROP NOT NULL;
ALTER TABLE product_images ALTER COLUMN shopify_id DROP NOT NULL;

-- +goose Down
-- A basic cannot satisfy NOT NULL, and Postgres cannot drop an enum value, so the basics go first. This fails while an
-- outfit still holds one.
DELETE FROM products WHERE source = 'basic';
ALTER TABLE product_images ALTER COLUMN shopify_id SET NOT NULL;
ALTER TABLE products ALTER COLUMN handle SET NOT NULL;
ALTER TABLE products ALTER COLUMN shopify_id SET NOT NULL;

ALTER TABLE products ALTER COLUMN source DROP DEFAULT;
ALTER TYPE product_source RENAME TO product_source_old;
CREATE TYPE product_source AS ENUM ('birdie_and_claire', 'demo');
ALTER TABLE products ALTER COLUMN source TYPE product_source USING source::text::product_source;
ALTER TABLE products ALTER COLUMN source SET DEFAULT 'demo';
DROP TYPE product_source_old;
