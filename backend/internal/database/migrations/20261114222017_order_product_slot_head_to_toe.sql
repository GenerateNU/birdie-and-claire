-- +goose Up
-- An enum sorts in declaration order, so ORDER BY slot lists an outfit's pieces head to toe. A new slot takes its
-- place with ALTER TYPE ... ADD VALUE ... BEFORE or AFTER.
ALTER TYPE product_slot RENAME TO product_slot_old;
CREATE TYPE product_slot AS ENUM ('top', 'one_piece', 'bottom', 'shoe', 'accessory');
ALTER TABLE products ALTER COLUMN slot TYPE product_slot USING slot::text::product_slot;
DROP TYPE product_slot_old;

-- +goose Down
ALTER TYPE product_slot RENAME TO product_slot_old;
CREATE TYPE product_slot AS ENUM ('top', 'bottom', 'accessory', 'shoe', 'one_piece');
ALTER TABLE products ALTER COLUMN slot TYPE product_slot USING slot::text::product_slot;
DROP TYPE product_slot_old;
