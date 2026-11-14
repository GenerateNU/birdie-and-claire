-- +goose Up
ALTER TABLE outfit_products
    DROP CONSTRAINT outfit_products_outfit_id_fkey,
    ADD CONSTRAINT outfit_products_outfit_id_fkey
        FOREIGN KEY (outfit_id) REFERENCES outfits(id) ON DELETE CASCADE;

-- +goose Down
ALTER TABLE outfit_products
    DROP CONSTRAINT outfit_products_outfit_id_fkey,
    ADD CONSTRAINT outfit_products_outfit_id_fkey
        FOREIGN KEY (outfit_id) REFERENCES outfits(id);
