package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"
)

var migrationName = regexp.MustCompile(`^[a-z0-9_]+$`)

// migrationsDir is where goose scaffolds new .sql files. Applying them is a Go
// command, not the goose CLI, because the server embeds this directory.
const migrationsDir = "internal/database/migrations"

func main() {
	if err := run(); err != nil {
		_, _ = fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func run() error {
	if len(os.Args) < 2 {
		return errors.New("usage: go run ./cmd/tasks <bootstrap|setup|backend|dev|db|floci>")
	}

	root, err := repositoryRoot()
	if err != nil {
		return err
	}

	handled, err := injectSecrets(root, os.Args[1:])
	if handled {
		return err
	}
	if err != nil {
		return err
	}

	switch os.Args[1] {
	case "bootstrap":
		return command(root, "mise", "install").Run()
	case "setup":
		return setup(root)
	case "backend":
		return backend(root)
	case "dev":
		return dev(root)
	case "db":
		return database(root, os.Args[2:])
	case "floci":
		return floci(root, os.Args[2:])
	default:
		return fmt.Errorf("unknown task %q", os.Args[1])
	}
}

// repositoryRoot walks up from the working directory to the nearest directory
// holding mise.toml, so tasks work from anywhere in the tree.
func repositoryRoot() (string, error) {
	directory, err := os.Getwd()
	if err != nil {
		return "", fmt.Errorf("get working directory: %w", err)
	}

	for {
		if _, err := os.Stat(filepath.Join(directory, "mise.toml")); err == nil {
			return directory, nil
		}

		parent := filepath.Dir(directory)
		if parent == directory {
			return "", errors.New("find repository root: no mise.toml in any parent directory")
		}
		directory = parent
	}
}

func setup(root string) error {
	for _, binary := range []string{"docker", "mise"} {
		if _, err := exec.LookPath(binary); err != nil {
			return fmt.Errorf("%s is required", binary)
		}
	}
	if err := command(filepath.Join(root, "backend"), "go", "mod", "download").Run(); err != nil {
		return err
	}
	if err := checkSecretsTooling(root); err != nil {
		return err
	}
	return command(root, "bun", "install", "--cwd", "frontend", "--frozen-lockfile").Run()
}

func backend(root string) error {
	if err := ensureDatabase(root); err != nil {
		return err
	}
	ctx, stop := signalContext()
	defer stop()
	defer removeAPI(root)
	return commandError(ctx, apiCommand(ctx, root).Run())
}

func dev(root string) error {
	if err := ensureDatabase(root); err != nil {
		return err
	}
	ctx, stop := signalContext()
	defer stop()
	defer removeAPI(root)

	backendCommand := apiCommand(ctx, root)
	frontendCommand := commandContext(ctx, filepath.Join(root, "frontend"), "bun", "run", "dev")
	if err := backendCommand.Start(); err != nil {
		return err
	}
	if err := frontendCommand.Start(); err != nil {
		_ = backendCommand.Process.Kill()
		_ = backendCommand.Wait()
		return err
	}

	backendDone := make(chan error, 1)
	frontendDone := make(chan error, 1)
	go func() { backendDone <- backendCommand.Wait() }()
	go func() { frontendDone <- frontendCommand.Wait() }()

	select {
	case err := <-backendDone:
		stopProcess(frontendCommand)
		<-frontendDone
		return commandError(ctx, err)
	case err := <-frontendDone:
		stopProcess(backendCommand)
		<-backendDone
		return commandError(ctx, err)
	}
}

func database(root string, args []string) error {
	if len(args) == 0 {
		return errors.New("usage: db <start|stop|reset|migrate>")
	}
	switch args[0] {
	case "start":
		return compose(root, "up", "-d", "--wait", "db").Run()
	case "stop":
		return compose(root, "stop", "db").Run()
	case "reset":
		return resetDatabase(root)
	case "migrate":
		return migrate(root, args[1:])
	default:
		return fmt.Errorf("unknown database task %q", args[0])
	}
}

func migrate(root string, args []string) error {
	if len(args) == 0 {
		return errors.New("usage: db migrate <create|up|down|status>")
	}

	action := args[0]
	if action == "create" {
		if len(args) != 2 || args[1] == "" {
			return errors.New("usage: mise run db:dev:migrate:create -- <name>")
		}
		if !migrationName.MatchString(args[1]) {
			return errors.New("migration names may contain lowercase letters, digits, and underscores only")
		}
		return command(filepath.Join(root, "backend"), "goose", "-dir", migrationsDir, "create", args[1], "sql").Run()
	}
	if action != "up" && action != "down" && action != "status" {
		return fmt.Errorf("unknown migration action %q", action)
	}
	if err := requireDatabase(root); err != nil {
		return err
	}
	return compose(root, "run", "--rm", "--no-deps", "api", "go", "run", "./cmd/migrate", action).Run()
}

func resetDatabase(root string) error {
	wasRunning, err := serviceRunning(root, "api")
	if err != nil {
		return err
	}
	if err := compose(root, "down", "--remove-orphans").Run(); err != nil {
		return err
	}

	volume := exec.Command("docker", "volume", "inspect", "example_project-postgres-data")
	volume.Dir = root
	if err := volume.Run(); err == nil {
		if err := command(root, "docker", "volume", "rm", "example_project-postgres-data").Run(); err != nil {
			return fmt.Errorf("remove development database volume: %w", err)
		}
	}
	if err := compose(root, "up", "-d", "--wait", "db").Run(); err != nil {
		return err
	}
	if err := migrate(root, []string{"up"}); err != nil {
		return err
	}
	if wasRunning {
		return compose(root, "up", "-d", "api").Run()
	}
	return nil
}

func floci(root string, args []string) error {
	if len(args) != 1 {
		return errors.New("usage: floci <start|stop|status|reset>")
	}
	arguments := []string{"compose", "--profile", "floci"}
	switch args[0] {
	case "start":
		arguments = append(arguments, "up", "-d", "floci")
	case "stop":
		arguments = append(arguments, "stop", "floci")
	case "status":
		arguments = append(arguments, "ps", "floci")
	case "reset":
		arguments = append(arguments, "rm", "--stop", "--force", "--volumes", "floci")
	default:
		return fmt.Errorf("unknown Floci task %q", args[0])
	}
	return command(root, "docker", arguments...).Run()
}

// apiCommand runs the API attached with --no-deps, so the database container it
// depends on is neither recreated nor torn down along with it.
func apiCommand(ctx context.Context, root string) *exec.Cmd {
	return composeContext(ctx, root, "up", "--build", "--no-deps", "--abort-on-container-exit", "--exit-code-from", "api", "api")
}

// removeAPI deletes the API container when a run ends. The database keeps
// running so the next start reuses it.
func removeAPI(root string) {
	_ = compose(root, "rm", "--force", "--stop", "api").Run()
}

// ensureDatabase starts the database only when it is not already up, so a
// database left running by an earlier task is reused rather than recreated.
func ensureDatabase(root string) error {
	running, err := serviceRunning(root, "db")
	if err != nil {
		return err
	}
	if running {
		return nil
	}
	return compose(root, "up", "-d", "--wait", "db").Run()
}

func requireDatabase(root string) error {
	running, err := serviceRunning(root, "db")
	if err != nil {
		return err
	}
	if !running {
		return errors.New("development database is not running; run mise run db:dev:start")
	}
	return nil
}

func serviceRunning(root, service string) (bool, error) {
	cmd := exec.Command("docker", "compose", "ps", "--services", "--status", "running")
	cmd.Dir = root
	output, err := cmd.Output()
	if err != nil {
		return false, err
	}
	return strings.TrimSpace(string(output)) == service || strings.Contains("\n"+strings.TrimSpace(string(output))+"\n", "\n"+service+"\n"), nil
}

func signalContext() (context.Context, context.CancelFunc) {
	return signal.NotifyContext(context.Background(), os.Interrupt)
}

func command(directory, name string, args ...string) *exec.Cmd {
	return commandContext(context.Background(), directory, name, args...)
}

func commandContext(ctx context.Context, directory, name string, args ...string) *exec.Cmd {
	cmd := exec.CommandContext(ctx, name, args...)
	cmd.Dir = directory
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd
}

func compose(directory string, args ...string) *exec.Cmd {
	return command(directory, "docker", append([]string{"compose"}, args...)...)
}

func composeContext(ctx context.Context, directory string, args ...string) *exec.Cmd {
	return commandContext(ctx, directory, "docker", append([]string{"compose"}, args...)...)
}

func stopProcess(cmd *exec.Cmd) {
	if cmd.Process != nil {
		if runtime.GOOS == "windows" {
			_ = exec.Command("taskkill", "/PID", fmt.Sprint(cmd.Process.Pid), "/T", "/F").Run()
			return
		}
		_ = exec.Command("pkill", "-TERM", "-P", fmt.Sprint(cmd.Process.Pid)).Run()
		_ = cmd.Process.Kill()
	}
}

func commandError(ctx context.Context, err error) error {
	if errors.Is(ctx.Err(), context.Canceled) {
		return nil
	}
	return err
}
