-- +goose Up
CREATE TABLE characters (
    id              BIGSERIAL PRIMARY KEY,
    name            TEXT NOT NULL,
    species         TEXT NOT NULL,
    faction         TEXT NOT NULL,
    force_sensitive BOOLEAN NOT NULL DEFAULT FALSE,
    power_level     INTEGER NOT NULL DEFAULT 0
);

INSERT INTO characters (name, species, faction, force_sensitive, power_level) VALUES
    ('Luke Skywalker', 'Human', 'rebel', TRUE, 85),
    ('Han Solo', 'Human', 'rebel', FALSE, 60),
    ('Princess Leia', 'Human', 'rebel', TRUE, 70),
    ('Darth Vader', 'Human', 'empire', TRUE, 95),
    ('Emperor Palpatine', 'Human', 'empire', TRUE, 98),
    ('Stormtrooper', 'Human', 'empire', FALSE, 30),
    ('Yoda', 'Unknown', 'jedi', TRUE, 92),
    ('Obi-Wan Kenobi', 'Human', 'jedi', TRUE, 88),
    ('Boba Fett', 'Human', 'neutral', FALSE, 75),
    ('Ahsoka Tano', 'Togruta', 'neutral', TRUE, 80);

-- +goose Down
DROP TABLE characters;
