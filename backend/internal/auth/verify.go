package auth

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/MicahParks/keyfunc/v3"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/time/rate"

	"example_project/internal/config"
)

const (
	// how often the keys are re-downloaded in the background
	refreshInterval = 15 * time.Minute
	// how often a token with an unknown key may trigger a re-download
	unknownKeyRetry = 60 * time.Second
	// how long a request waits for that re-download before failing
	unknownKeyWaitMax = 5 * time.Second
	// how much clock difference with Supabase is allowed
	clockLeeway = 30 * time.Second
)

// returned for any bad token, so callers can just answer 401
var ErrInvalidToken = errors.New("invalid token")

// holds the saved public keys and the rules for checking tokens
type Verifier struct {
	keys   keyfunc.Keyfunc
	parser *jwt.Parser
}

// downloads the public keys at startup and sets up the token rules
func NewVerifier(ctx context.Context, cfg config.SupabaseConfig) (*Verifier, error) {
	// saves the keys in memory and refreshes them in the background until ctx ends
	keys, err := keyfunc.NewDefaultOverrideCtx(ctx, []string{cfg.JWKSURL()}, keyfunc.Override{
		RefreshInterval:   refreshInterval,
		RefreshUnknownKID: rate.NewLimiter(rate.Every(unknownKeyRetry), 1),
		RateLimitWaitMax:  unknownKeyWaitMax,
	})
	if err != nil {
		return nil, fmt.Errorf("auth: create key set: %w", err)
	}

	v := &Verifier{
		keys: keys,
		// token must come from our project, be for a logged-in user, use ES256, and expire
		parser: jwt.NewParser(
			jwt.WithIssuer(cfg.Issuer()),
			jwt.WithAudience("authenticated"),
			jwt.WithValidMethods([]string{"ES256"}),
			jwt.WithExpirationRequired(),
			jwt.WithLeeway(clockLeeway),
		),
	}

	// keeps running without keys, since keyfunc keeps retrying in the background
	if !v.KeysLoaded(ctx) {
		slog.WarnContext(ctx, "auth: started without signing keys, every token will be rejected until they load", "url", cfg.JWKSURL())
	}

	return v, nil
}

// checks a token and returns the user ID inside it
func (v *Verifier) Verify(token string) (string, error) {
	var claims jwt.RegisteredClaims
	if _, err := v.parser.ParseWithClaims(token, &claims, v.keys.Keyfunc); err != nil {
		return "", fmt.Errorf("%w: %w", ErrInvalidToken, err)
	}

	// rejects a token that has no user ID
	if claims.Subject == "" {
		return "", fmt.Errorf("%w: missing sub claim", ErrInvalidToken)
	}

	return claims.Subject, nil
}

// reports whether at least one public key is saved in memory
func (v *Verifier) KeysLoaded(ctx context.Context) bool {
	loaded, err := v.keys.Storage().KeyReadAll(ctx)
	return err == nil && len(loaded) > 0
}
