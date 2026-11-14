package main

// Everything Keyflare-specific lives in this file. To drop Keyflare, delete it
// and delete the loadSecrets call in run(); the remaining tasks then read
// their variables from the process environment or a .env file, which is what
// Docker Compose already expects.

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"strings"
)

const (
	keyflareVersion = "0.1.1"
	keyflareProject = "test_project"
	keyflareEnvDev  = "dev"
	keyflareEnvProd = "prod"
)

var secretsRequired = map[string]bool{
	"backend":  true,
	"frontend": true,
	"dev":      true,
	"db":       true,
	"floci":    true,
}

// secretsEnv reports which Keyflare environment a task reads from. The second
// result is false when the task needs no secrets at all.
func secretsEnv(args []string) (string, bool) {
	if len(args) == 0 {
		return "", false
	}
	if args[0] == "db" && len(args) > 1 && args[1] == "prod" {
		return keyflareEnvProd, true
	}
	if args[0] == "deploy" {
		return keyflareEnvProd, true
	}
	if secretsRequired[args[0]] {
		return keyflareEnvDev, true
	}
	return "", false
}

// loadSecrets puts the task's secrets in this process's environment, so every
// command the task starts inherits them. Tasks that need none are left alone.
func loadSecrets(root string, args []string) error {
	environment, required := secretsEnv(args)
	if !required {
		return nil
	}

	secrets, err := downloadSecrets(root, environment)
	if err != nil {
		return fmt.Errorf("load secrets for %q from %s/%s: %w", strings.Join(args, " "), keyflareProject, environment, err)
	}
	for name, value := range secrets {
		if err := os.Setenv(name, value); err != nil {
			return fmt.Errorf("set %s from %s/%s: %w", name, keyflareProject, environment, err)
		}
	}
	return nil
}

// downloadSecrets returns the secrets of one Keyflare environment.
func downloadSecrets(root, environment string) (map[string]string, error) {
	output, err := runDownload(root, environment)
	if err != nil {
		return nil, err
	}
	return parseSecrets(output)
}

// runDownload prints one Keyflare environment's secrets as JSON. It avoids kfl
// run, whose detached child opens a console window on Windows.
func runDownload(root, environment string) ([]byte, error) {
	cmd := exec.Command("kfl", "download", "--project", keyflareProject, "--env", environment, "--format", "json")
	cmd.Dir = root
	// Node warnings would otherwise land in the error text withStderr returns.
	cmd.Env = append(os.Environ(), "NODE_NO_WARNINGS=1")
	output, err := cmd.Output()
	if err != nil {
		return nil, withStderr(err)
	}
	return output, nil
}

// parseSecrets reads the JSON object of names to values that kfl download
// prints. Anything else is an error, including null and {}, because no
// Keyflare environment the tasks use is meant to be empty.
func parseSecrets(output []byte) (map[string]string, error) {
	var secrets map[string]string
	if err := json.Unmarshal(output, &secrets); err != nil {
		return nil, fmt.Errorf("parse kfl download output: %w%s", err, outputPrefix(output))
	}
	if len(secrets) == 0 {
		return nil, errors.New("kfl download returned no secrets")
	}
	return secrets, nil
}

// outputPrefix quotes the start of output that is not a JSON object, so a CLI
// notice is visible in the error. An object is never quoted: it holds secrets.
func outputPrefix(output []byte) string {
	text := strings.TrimSpace(string(output))
	if text == "" {
		return " (output was empty)"
	}
	if strings.HasPrefix(text, "{") {
		return ""
	}
	line, _, _ := strings.Cut(text, "\n")
	if len(line) > 80 {
		line = line[:80]
	}
	return fmt.Sprintf(" (output began %q)", line)
}

// checkSecretsTooling verifies kfl is installed at the pinned version and can
// download the dev environment's secrets. It does not parse them: a bad value
// is loadSecrets's error, not a sign that access is missing.
func checkSecretsTooling(root string) error {
	if _, err := exec.LookPath("kfl"); err != nil {
		return fmt.Errorf("kfl is required; install it with: npm install -g @keyflare/cli@%s", keyflareVersion)
	}

	versionCmd := exec.Command("kfl", "--version")
	versionCmd.Dir = root
	version, err := versionCmd.Output()
	if err != nil {
		return fmt.Errorf("check Keyflare version: %w", withStderr(err))
	}
	if strings.TrimSpace(string(version)) != keyflareVersion {
		return fmt.Errorf("keyflare CLI %s is required; install it with: npm install -g @keyflare/cli@%s", keyflareVersion, keyflareVersion)
	}

	if _, err := runDownload(root, keyflareEnvDev); err != nil {
		return fmt.Errorf("validate Keyflare access to %s/%s: %w", keyflareProject, keyflareEnvDev, err)
	}
	return nil
}
