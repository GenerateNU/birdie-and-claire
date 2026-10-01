-- +goose Up
CREATE TABLE outfit_products (
    outfit_id  UUID NOT NULL REFERENCES outfits(id),
    product_id UUID NOT NULL REFERENCES products(id),
    PRIMARY KEY (outfit_id, product_id)
);

-- +goose Down
DROP TABLE outfit_products;
