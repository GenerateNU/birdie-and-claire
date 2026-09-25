-- +goose Up
-- id is the "sub" claim from a Supabase access token. There is deliberately no
-- foreign key to auth.users: that schema only exists in the Supabase project,
-- and this migration also has to apply to the local development database. For
-- the same reason nothing here cascades when Supabase deletes an account.
-- Nothing populates this table yet; the auth layer upserts a row on first sight
-- of a token.
CREATE TABLE users (
    id         UUID PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- +goose Down
DROP TABLE users;
