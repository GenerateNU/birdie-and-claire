-- +goose Up
-- name is the display name shown alongside a profile picture. profile_picture_key
-- is the object storage key (e.g. users/<id>/profile-picture), nullable because a
-- user may have no picture yet. The public URL is derived from the key, never stored.
ALTER TABLE users ADD COLUMN name                TEXT;
ALTER TABLE users ADD COLUMN profile_picture_key TEXT;

-- +goose Down
ALTER TABLE users DROP COLUMN profile_picture_key;
ALTER TABLE users DROP COLUMN name;
