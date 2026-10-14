-- +goose Up
CREATE TYPE product_slot AS ENUM ('top', 'bottom', 'accessory', 'shoe');

-- Fails while any product has a NULL slot or a value outside the enum. Classify those rows first.
ALTER TABLE products ALTER COLUMN slot TYPE product_slot USING slot::product_slot;
ALTER TABLE products ALTER COLUMN slot SET NOT NULL;

-- +goose Down
ALTER TABLE products ALTER COLUMN slot DROP NOT NULL;
ALTER TABLE products ALTER COLUMN slot TYPE TEXT USING slot::text;
DROP TYPE product_slot;
