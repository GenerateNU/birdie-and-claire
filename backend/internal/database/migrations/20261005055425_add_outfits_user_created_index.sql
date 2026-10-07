-- +goose Up
-- Serves the outfits list: "WHERE user_id = ... AND (created_at, id) < ... ORDER BY created_at DESC, id DESC".
CREATE INDEX idx_outfits_user_id_created_at_id ON outfits (user_id, created_at DESC, id DESC);

-- +goose Down
DROP INDEX idx_outfits_user_id_created_at_id;
