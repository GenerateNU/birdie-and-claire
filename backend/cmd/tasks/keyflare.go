package main

// Everything Keyflare-specific lives in this file. To drop Keyflare, delete it
// and delete the injectSecrets call in run(); the remaining tasks then read
// their variables from the process environment or a .env file, which is what
// Docker Compose already expects.

import (
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

	// secretsLoaded marks a process that is already running inside the
	// injector, so re-execution does not recurse.
	secretsLoaded = "EXAMPLE_PROJECT_SECRETS_LOADED"
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
	if secretsRequired[args[0]] {
		return keyflareEnvDev, true
	}
	return "", false
}

// injectSecrets re-runs this command with secrets in its environment. It
// reports whether the command was handled, which is false when the task needs
// no secrets or the process is already inside the injector.
func injectSecrets(root string, args []string) (bool, error) {
	environment, required := secretsEnv(args)
	if !required || os.Getenv(secretsLoaded) != "" {
		return false, nil
	}

	commandArgs := append(
		[]string{"run", "--project", keyflareProject, "--env", environment, "--", "go", "-C", "backend", "run", "./cmd/tasks"},
		args...,
	)
	cmd := command(root, "kfl", commandArgs...)
	cmd.Env = append(os.Environ(), "NODE_NO_WARNINGS=1", secretsLoaded+"=1")
	return true, cmd.Run()
}

// checkSecretsTooling verifies the injector is installed at the pinned version
// and that this account can read the project.
func checkSecretsTooling(root string) error {
	if _, err := exec.LookPath("kfl"); err != nil {
		return fmt.Errorf("kfl is required; install it with: npm install -g @keyflare/cli@%s", keyflareVersion)
	}

	versionCmd := exec.Command("kfl", "--version")
	versionCmd.Dir = root
	version, err := versionCmd.Output()
	if err != nil {
		return fmt.Errorf("check Keyflare version: %w", err)
	}
	if strings.TrimSpace(string(version)) != keyflareVersion {
		return fmt.Errorf("keyflare CLI %s is required; install it with: npm install -g @keyflare/cli@%s", keyflareVersion, keyflareVersion)
	}

	access := command(root, "kfl", "run", "--project", keyflareProject, "--env", keyflareEnvDev, "--", "go", "version")
	access.Env = append(os.Environ(), "NODE_NO_WARNINGS=1")
	if err := access.Run(); err != nil {
		return fmt.Errorf("validate Keyflare access to %s/%s: %w", keyflareProject, keyflareEnvDev, err)
	}
	return nil
}
