package db

import (
	"database/sql"
	"fmt"

	"github.com/bootcamp/starwars-api/models"
	_ "modernc.org/sqlite"
)

// DB is the shared in-memory SQLite connection.
var DB *sql.DB

// Init opens the in-memory database and seeds it with character data.
func Init() error {
	var err error
	DB, err = sql.Open("sqlite", ":memory:")
	if err != nil {
		return fmt.Errorf("open db: %w", err)
	}
	return seed()
}

func seed() error {
	_, err := DB.Exec(`
		CREATE TABLE characters (
			id              INTEGER PRIMARY KEY AUTOINCREMENT,
			name            TEXT    NOT NULL,
			species         TEXT    NOT NULL,
			faction         TEXT    NOT NULL,
			force_sensitive INTEGER NOT NULL DEFAULT 0,
			power_level     INTEGER NOT NULL DEFAULT 0
		)
	`)
	if err != nil {
		return fmt.Errorf("create table: %w", err)
	}

	rows := []struct {
		name           string
		species        string
		faction        string
		forceSensitive int
		powerLevel     int
	}{
		{"Luke Skywalker", "Human", "rebel", 1, 85},
		{"Han Solo", "Human", "rebel", 0, 60},
		{"Princess Leia", "Human", "rebel", 1, 70},
		{"Darth Vader", "Human", "empire", 1, 95},
		{"Emperor Palpatine", "Human", "empire", 1, 98},
		{"Stormtrooper", "Human", "empire", 0, 30},
		{"Yoda", "Unknown", "jedi", 1, 92},
		{"Obi-Wan Kenobi", "Human", "jedi", 1, 88},
		{"Boba Fett", "Human", "neutral", 0, 75},
		{"Ahsoka Tano", "Togruta", "neutral", 1, 80},
	}

	for _, c := range rows {
		_, err := DB.Exec(
			`INSERT INTO characters (name, species, faction, force_sensitive, power_level)
			 VALUES (?, ?, ?, ?, ?)`,
			c.name, c.species, c.faction, c.forceSensitive, c.powerLevel,
		)
		if err != nil {
			return fmt.Errorf("insert %s: %w", c.name, err)
		}
	}
	return nil
}

// GetCharactersByFaction returns all characters belonging to the given faction.
func GetCharactersByFaction(faction string) ([]models.Character, error) {
	// TODO: Write a SQL query to fetch all characters where faction = ?
	//
	// Hint: Use DB.Query with a parameterized query, for example:
	//   rows, err := DB.Query("SELECT id, name, species, faction, force_sensitive, power_level FROM characters WHERE faction = ?", faction)
	//
	// Then loop with rows.Next() and call rows.Scan(...) to populate each models.Character.
	//
	// Note: force_sensitive is stored as INTEGER (0 or 1) in SQLite.
	//       Scan it into a local int variable, then convert:
	//       c.ForceSensitive = fs == 1
	//
	// Don't forget to:
	//   - check the error from DB.Query
	//   - defer rows.Close()
	//   - check rows.Err() after the loop
	rows, err := DB.Query("SELECT id, name, species, faction, force_sensitive, power_level FROM characters WHERE faction = ?", faction)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var characters []models.Character
	for rows.Next() {
		var c models.Character
		var fs int
		err := rows.Scan(&c.ID, &c.Name, &c.Species, &c.Faction, &fs, &c.PowerLevel)
		if err != nil {
			return nil, err
		}
		c.ForceSensitive = fs == 1
		characters = append(characters, c)
	}
	if err = rows.Err(); err != nil {
		return nil, err
	}
	return characters, nil
}
