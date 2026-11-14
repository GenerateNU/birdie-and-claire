-- +goose Up
CREATE TABLE collections (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Serves the collections list: "WHERE user_id = ... ORDER BY created_at DESC, id DESC".
CREATE INDEX idx_collections_user_id_created_at_id ON collections (user_id, created_at DESC, id DESC);

CREATE TABLE collection_outfits (
    collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    outfit_id     UUID NOT NULL REFERENCES outfits(id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (collection_id, outfit_id)
);

-- Serves a collection's outfits, newest added first, and indexes the collection_id foreign key.
CREATE INDEX idx_collection_outfits_collection_id_created_at_outfit_id
    ON collection_outfits (collection_id, created_at DESC, outfit_id DESC);
-- Serves the cascade when an outfit is deleted.
CREATE INDEX idx_collection_outfits_outfit_id ON collection_outfits (outfit_id);

-- +goose Down
DROP TABLE collection_outfits;
DROP TABLE collections;
