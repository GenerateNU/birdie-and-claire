-- +goose Up
-- name is the display name shown alongside a profile picture. avatar_key is the
-- object storage key (e.g. users/<id>/avatar), nullable because a user may have
-- no picture yet. The public URL is derived from the key, never stored.
ALTER TABLE users ADD COLUMN name       TEXT;
ALTER TABLE users ADD COLUMN avatar_key TEXT;

-- +goose Down
ALTER TABLE users DROP COLUMN avatar_key;
ALTER TABLE users DROP COLUMN name;
