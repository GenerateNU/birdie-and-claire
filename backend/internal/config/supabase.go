package config

import (
	"fmt"
	"net/url"
	"os"
	"strings"
)

// SupabaseConfig points at the Supabase project that issues access tokens. It
// is unrelated to DatabaseConfig: development runs against a local PostgreSQL
// while still verifying tokens against Supabase.
type SupabaseConfig struct {
	URL string
}

// JWKSURL is where Supabase publishes the public keys that sign access tokens.
// The .well-known path is the one served without an apikey header; the shorter
// /auth/v1/jwks sits behind the API gateway and answers 401.
func (s SupabaseConfig) JWKSURL() string {
	return s.URL + "/auth/v1/.well-known/jwks.json"
}

// Issuer is the "iss" claim Supabase puts in every access token it signs.
func (s SupabaseConfig) Issuer() string {
	return s.URL + "/auth/v1"
}

func loadSupabase() (SupabaseConfig, error) {
	raw := strings.TrimSuffix(os.Getenv("SUPABASE_URL"), "/")
	if raw == "" {
		return SupabaseConfig{}, fmt.Errorf("SUPABASE_URL is required")
	}

	parsed, err := url.Parse(raw)
	if err != nil || parsed.Scheme != "https" || parsed.Host == "" {
		return SupabaseConfig{}, fmt.Errorf("SUPABASE_URL must be an https project URL, got %q", raw)
	}

	return SupabaseConfig{URL: raw}, nil
}
