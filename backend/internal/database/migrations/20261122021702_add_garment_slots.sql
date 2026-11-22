-- +goose Up
-- Each value is placed against an existing one, since a value added in this transaction can't be used until it commits.
ALTER TYPE product_slot ADD VALUE 'hat' BEFORE 'top';
ALTER TYPE product_slot ADD VALUE 'scarf' BEFORE 'top';
ALTER TYPE product_slot ADD VALUE 'jacket' BEFORE 'top';
ALTER TYPE product_slot ADD VALUE 'belt' AFTER 'one_piece';
ALTER TYPE product_slot ADD VALUE 'bag' AFTER 'shoe';

-- +goose Down
-- Fails while any product has one of the new slots. Reclassify or delete those rows first.
ALTER TYPE product_slot RENAME TO product_slot_old;
CREATE TYPE product_slot AS ENUM ('top', 'one_piece', 'bottom', 'shoe', 'accessory');
ALTER TABLE products ALTER COLUMN slot TYPE product_slot USING slot::text::product_slot;
DROP TYPE product_slot_old;
