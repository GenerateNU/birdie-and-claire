// Command verify-jwt is a throwaway harness for proving a Supabase JWT can
// be verified against the project's JWKS. Delete this folder once the real
// middleware is wired in — it exists only to isolate the crypto from HTTP.
package main

import (
	"fmt"
	"os"

	"github.com/MicahParks/keyfunc/v3"
	"github.com/golang-jwt/jwt/v5"
)

func main() {
	// did the user give two extra args
	if len(os.Args) != 3 {
		fmt.Println("usage: go run ./cmd/verify-jwt <supabase-project-url> <token>")
		os.Exit(1)
	}

	projectURL := os.Args[1]
	token := os.Args[2]

	// builds jwks url
	jwksURL := projectURL + "/auth/v1/.well-known/jwks.json"

	// fetched the keyset
	jwks, err := keyfunc.NewDefault([]string{jwksURL})
	if err != nil {
		fmt.Println("failed to fetch JWKS:", err)
		os.Exit(1)
	}

	// parsing and verifying the token
	claims := jwt.MapClaims{}
	parsed, err := jwt.ParseWithClaims(token, claims, jwks.Keyfunc)
	if err != nil {
		fmt.Println("failed to verify token:", err)
		os.Exit(1)
	}

	if !parsed.Valid {
		fmt.Println("token parsed but reported invalid")
		os.Exit(1)
	}

	fmt.Println("token is valid")
	fmt.Println("user id (sub):", claims["sub"])
}