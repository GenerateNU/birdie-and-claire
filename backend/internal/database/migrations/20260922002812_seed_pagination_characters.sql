-- +goose Up
-- At the frontend's page size of two the original seed never needs a second
-- "Load more", never ends on an exact boundary, and never ties. These rows do
-- all three: rebel 3->7, jedi 2->4, and power_level 70 shared by three rows,
-- which cannot fit one page, so the ranked tie always spans a boundary.
INSERT INTO characters (name, species, faction, force_sensitive, power_level) VALUES
    ('Chewbacca', 'Wookiee', 'rebel', FALSE, 65),
    ('Wedge Antilles', 'Human', 'rebel', FALSE, 55),
    ('Jyn Erso', 'Human', 'rebel', FALSE, 70),
    ('Cassian Andor', 'Human', 'rebel', FALSE, 58),
    ('Mace Windu', 'Human', 'jedi', TRUE, 90),
    ('Qui-Gon Jinn', 'Human', 'jedi', TRUE, 70);

-- +goose Down
-- By name, not id: ids depend on the sequence and the original seed must survive.
DELETE FROM characters WHERE name IN (
    'Chewbacca',
    'Wedge Antilles',
    'Jyn Erso',
    'Cassian Andor',
    'Mace Windu',
    'Qui-Gon Jinn'
);
