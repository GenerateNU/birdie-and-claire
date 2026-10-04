-- +goose Up
CREATE TABLE outfit_reactions (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    outfit_id  UUID NOT NULL REFERENCES outfits(id) ON DELETE CASCADE,
    kind       TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- +goose Down
DROP TABLE outfit_reactions;