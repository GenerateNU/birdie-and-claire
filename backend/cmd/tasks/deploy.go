package main

import (
	"errors"
	"fmt"
	"os"
	"strings"
)

// backendEnvNames are the variables the deployed backend reads, apart from
// DATABASE_URL, which production assembles from the DB_* parts.
var backendEnvNames = []string{
	"SUPABASE_URL",
	"S3_BUCKET",
	"S3_REGION",
	"S3_ENDPOINT",
	"S3_PUBLIC_ENDPOINT",
	"S3_PUBLIC_URL",
	"S3_MAX_UPLOAD_BYTES",
	"AWS_ACCESS_KEY_ID",
	"AWS_SECRET_ACCESS_KEY",
	"EMBEDDER_URL",
	"MODAL_PROXY_KEY",
	"MODAL_PROXY_SECRET",
}

const deployEnvUsage = "usage: deploy env <production|preview> <output-file>"

func deploy(args []string) error {
	if len(args) != 3 || args[0] != "env" {
		return errors.New(deployEnvUsage)
	}
	return writeDeployEnv(args[1], args[2])
}

// writeDeployEnv writes the Docker env file the droplet runs the backend
// with. Preview files carry no DATABASE_URL: preview-up.sh adds one pointing
// at the PR's own database, so a preview can never fall back to production
// data.
func writeDeployEnv(target, path string) error {
	if target != "production" && target != "preview" {
		return errors.New(deployEnvUsage)
	}

	lines := []string{"LOG_FORMAT=json"}
	if target == "production" {
		databaseURL, err := productionDatabaseURL()
		if err != nil {
			return err
		}
		lines = append(lines, "DATABASE_URL="+databaseURL)
	}

	for _, name := range backendEnvNames {
		value := os.Getenv(name)
		if value == "" {
			continue
		}
		// Docker env files have no quoting, so a newline would end the value.
		if strings.ContainsAny(value, "\r\n") {
			return fmt.Errorf("%s contains a newline, which a Docker env file cannot hold", name)
		}
		lines = append(lines, name+"="+value)
	}

	contents := strings.Join(lines, "\n") + "\n"
	if err := os.WriteFile(path, []byte(contents), 0o600); err != nil {
		return fmt.Errorf("write %s: %w", path, err)
	}
	return nil
}
