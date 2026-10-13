-- Run via mise run db:dev:seed:outfits, or directly with psql -v user_id=<uuid> -v outfit_count=<n> -f outfits.sql.
-- Reruns replace that user's seed outfits. The fake products are shared by every user and updated in place.
BEGIN;

-- psql doesn't substitute :'user_id' inside $$, so the DO block reads it from a setting.
SET LOCAL seed.user_id = :'user_id';
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = current_setting('seed.user_id')::uuid) THEN
        RAISE EXCEPTION 'user % has no account; sign in and create it first', current_setting('seed.user_id');
    END IF;
END $$;

-- Real birdieandclaire.com products with fake Shopify IDs. Only flat-lay or ghost-mannequin photos, never
-- on-model ones, because the outfit canvas draws them over a silhouette.
-- product_type values are set by hand, since the store leaves most of them blank.
CREATE TEMP TABLE seed_products ON COMMIT DROP AS
SELECT *
FROM (
    VALUES
        (1, 'max-beanie-hat', 'Max Beanie Hat', 'Hats',
            'https://cdn.shopify.com/s/files/1/0523/5182/8140/files/Birdie_Claire-Max_Beanie_Hat-Merino_Wool-Deep_Red_Color-Layflat_Photo.png?v=1761448206'),
        (2, 'amanda-wrap', 'Amanda Poncho', 'Outerwear',
            'https://cdn.shopify.com/s/files/1/0523/5182/8140/files/Birdie_Claire-Amanda_Poncho-Merino_Wool-Navy_Color-Mannequin_Photo.png?v=1761187576'),
        (3, 'nora-mock-neck-sweater', 'Nora Mock Neck Sweater', 'Sweaters',
            'https://cdn.shopify.com/s/files/1/0523/5182/8140/files/Birdie_Claire-Nora_Sweater_Wool_Offwhite_Color_Grey_Mannequin.png?v=1763606770'),
        (4, 'annie-wool-crew-neck-sweater', 'Annie Wool Crew Neck Sweater', 'Sweaters',
            'https://cdn.shopify.com/s/files/1/0523/5182/8140/files/115_ee359a38-20bd-41c0-8b7f-e85c1359cd4b.png?v=1710115766'),
        (5, 'denise-skirt', 'Denise Skirt', 'Skirts',
            'https://cdn.shopify.com/s/files/1/0523/5182/8140/files/productphotoresize_7.png?v=1710117168'),
        (6, 'birdie-claire-reusable-tote-bag', 'Birdie & Claire Reusable Tote Bag', 'Bags',
            'https://cdn.shopify.com/s/files/1/0523/5182/8140/products/Birdie_Claire-Reusable_Cotton_Tote_Bag-Layflat_Photo.png?v=1761188812'),
        (7, 'mini-tote-with-your-choice-of-patch', 'Mini Tote with Your Choice of Patch', 'Bags',
            'https://cdn.shopify.com/s/files/1/0523/5182/8140/files/product_photo_resize_21.png?v=1786377134'),
        (8, 'randi-scarf', 'Randi Scarf', 'Scarf',
            'https://cdn.shopify.com/s/files/1/0523/5182/8140/files/254.png?v=1700261568'),
        (9, 'courtney-cover-up', 'Courtney Cover Up Tunic', 'Tops',
            'https://cdn.shopify.com/s/files/1/0523/5182/8140/files/458.png?v=1782507493')
) AS seed_product (shopify_id, handle, title, product_type, image_url);

INSERT INTO products (shopify_id, handle, title, product_type)
SELECT shopify_id, handle, title, product_type
FROM seed_products
ON CONFLICT (shopify_id) DO UPDATE
SET handle = EXCLUDED.handle, title = EXCLUDED.title, product_type = EXCLUDED.product_type, updated_at = now();

-- Replaced on every run, because product_images.shopify_id is unique and the insert below would conflict.
DELETE FROM product_images
WHERE product_id IN (SELECT id FROM products WHERE shopify_id IN (SELECT shopify_id FROM seed_products));

-- Each fake image reuses its product's fake Shopify ID. Every photo above is 1366x2048.
INSERT INTO product_images (shopify_id, product_id, url, alt_text, width, height)
SELECT seed_product.shopify_id, product.id, seed_product.image_url, seed_product.title, 1366, 2048
FROM seed_products seed_product
JOIN products product ON product.shopify_id = seed_product.shopify_id;

-- outfit_products.outfit_id has no ON DELETE, so its rows have to go before the outfits.
DELETE FROM outfit_products
WHERE outfit_id IN (SELECT id FROM outfits WHERE user_id = :'user_id'::uuid AND name ~ '^Seed outfit [0-9]+$');

DELETE FROM outfits WHERE user_id = :'user_id'::uuid AND name ~ '^Seed outfit [0-9]+$';

INSERT INTO outfits (user_id, name, created_at)
SELECT :'user_id'::uuid, 'Seed outfit ' || seed_number, now() - (seed_number || ' minutes')::interval
FROM generate_series(1, :'outfit_count'::int) seed_number;

-- Outfits cycle through three looks. Each has at most one item per canvas spot, so every item shows on
-- the silhouette. B&C sells no shoes, pants, or belts, so those spots stay empty.
INSERT INTO outfit_products (outfit_id, product_id)
SELECT outfit.id, product.id
FROM generate_series(1, :'outfit_count'::int) seed_number
JOIN outfits outfit ON outfit.user_id = :'user_id'::uuid AND outfit.name = 'Seed outfit ' || seed_number
JOIN (
    VALUES
        (1, 'max-beanie-hat'),
        (1, 'amanda-wrap'),
        (1, 'nora-mock-neck-sweater'),
        (1, 'denise-skirt'),
        (1, 'birdie-claire-reusable-tote-bag'),
        (2, 'randi-scarf'),
        (2, 'annie-wool-crew-neck-sweater'),
        (2, 'denise-skirt'),
        (2, 'birdie-claire-reusable-tote-bag'),
        (3, 'max-beanie-hat'),
        (3, 'courtney-cover-up'),
        (3, 'denise-skirt'),
        (3, 'mini-tote-with-your-choice-of-patch')
) AS look_product (look_number, handle) ON look_product.look_number = (seed_number - 1) % 3 + 1
-- Through the seed's own fake Shopify IDs: products.handle isn't unique, and a real product synced
-- into the same database would share the handle.
JOIN seed_products seed_product ON seed_product.handle = look_product.handle
JOIN products product ON product.shopify_id = seed_product.shopify_id;

COMMIT;
