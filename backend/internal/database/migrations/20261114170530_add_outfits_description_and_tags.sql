-- +goose Up
-- An outfit with no description or tags stores '' and '{}', so reads never see NULL.
ALTER TABLE outfits
    ADD COLUMN description TEXT NOT NULL DEFAULT '',
    ADD COLUMN tags TEXT[] NOT NULL DEFAULT '{}';

-- +goose Down
ALTER TABLE outfits
    DROP COLUMN description,
    DROP COLUMN tags;
