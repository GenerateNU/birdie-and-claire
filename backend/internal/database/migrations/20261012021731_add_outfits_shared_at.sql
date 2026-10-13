-- +goose Up
-- NULL means the outfit is private. A shared outfit is readable by anyone at
-- /api/public/outfits/{id}.
ALTER TABLE outfits ADD COLUMN shared_at TIMESTAMPTZ;

-- +goose Down
ALTER TABLE outfits DROP COLUMN shared_at;
