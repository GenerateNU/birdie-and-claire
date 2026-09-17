// Command openapi writes the tracked OpenAPI document from the registered
// routes. CI regenerates it and fails if the result differs from the committed
// file, so the spec cannot drift from the code.
package main

import (
	"fmt"
	"os"

	"example_project/internal/config"
	"example_project/internal/server"
)

const specPath = "openapi.yaml"

func main() {
	if err := run(); err != nil {
		_, _ = fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func run() error {
	document, err := server.Spec(&config.Configuration{App: config.AppConfig{Name: "Example Project API"}}).
		OpenAPI().
		YAML()
	if err != nil {
		return fmt.Errorf("marshal OpenAPI: %w", err)
	}

	if err := os.WriteFile(specPath, document, 0o644); err != nil {
		return fmt.Errorf("write %s: %w", specPath, err)
	}
	return nil
}
