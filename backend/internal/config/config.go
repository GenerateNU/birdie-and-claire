// Package config loads and validates process configuration at startup, one
// file per concern. Nothing outside this package reads the environment.
package config

type Configuration struct {
	App      AppConfig
	Database DatabaseConfig
	Supabase SupabaseConfig
}

// Load fails on the first missing or malformed variable, so a bad environment
// stops the process at startup rather than on the request that first needs it.
func Load() (*Configuration, error) {
	app, err := loadApp()
	if err != nil {
		return nil, err
	}

	database, err := loadDatabase()
	if err != nil {
		return nil, err
	}

	supabase, err := loadSupabase()
	if err != nil {
		return nil, err
	}

	return &Configuration{App: app, Database: database, Supabase: supabase}, nil
}
