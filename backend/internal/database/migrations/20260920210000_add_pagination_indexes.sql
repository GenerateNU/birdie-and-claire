-- +goose Up
-- Serves "WHERE faction = ... AND id > ... ORDER BY id" with one index scan.
CREATE INDEX idx_characters_faction_id ON characters (faction, id);

-- Ranked pages by (power_level, id) DESC; both columns, same direction as the query.
CREATE INDEX idx_characters_power_level_id ON characters (power_level DESC, id DESC);

-- +goose Down
DROP INDEX idx_characters_power_level_id;
DROP INDEX idx_characters_faction_id;
