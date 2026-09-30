-- +goose Up
CREATE TABLE outfit_reactions (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id),
    outfit_id  UUID NOT NULL REFERENCES outfits(id),
    kind       TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- +goose Down
DROP TABLE outfit_reactions;