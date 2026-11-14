-- +goose Up
ALTER TYPE product_slot ADD VALUE 'one_piece';

-- +goose Down
-- Postgres can't drop an enum value, so the type is rebuilt without it. Fails while any product has
-- the one_piece slot. Reclassify or delete those rows first.
ALTER TYPE product_slot RENAME TO product_slot_old;
CREATE TYPE product_slot AS ENUM ('top', 'bottom', 'accessory', 'shoe');
ALTER TABLE products ALTER COLUMN slot TYPE product_slot USING slot::text::product_slot;
DROP TYPE product_slot_old;
