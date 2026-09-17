package config

import (
	"fmt"
	"os"
	"strconv"
)

// LogFormat selects the slog handler the process installs.
type LogFormat string

const (
	LogFormatText LogFormat = "text"
	LogFormatJSON LogFormat = "json"
)

const (
	defaultName = "Example Project API"
	defaultPort = 8080
)

// AppConfig configures the HTTP server and process-wide logging.
type AppConfig struct {
	Name      string
	Port      int
	LogFormat LogFormat
}

func (a AppConfig) Address() string {
	return fmt.Sprintf("0.0.0.0:%d", a.Port)
}

func loadApp() (AppConfig, error) {
	port, err := loadPort()
	if err != nil {
		return AppConfig{}, err
	}

	logFormat, err := loadLogFormat()
	if err != nil {
		return AppConfig{}, err
	}

	return AppConfig{Name: defaultName, Port: port, LogFormat: logFormat}, nil
}

func loadPort() (int, error) {
	raw := os.Getenv("PORT")
	if raw == "" {
		return defaultPort, nil
	}

	port, err := strconv.Atoi(raw)
	if err != nil {
		return 0, fmt.Errorf("PORT must be a number, got %q", raw)
	}
	return port, nil
}

// loadLogFormat resolves the log handler explicitly rather than sniffing
// whether stdout is a TTY, which misreports under containers and CI runners.
func loadLogFormat() (LogFormat, error) {
	switch format := LogFormat(os.Getenv("LOG_FORMAT")); format {
	case "":
		return LogFormatText, nil
	case LogFormatText, LogFormatJSON:
		return format, nil
	default:
		return "", fmt.Errorf("LOG_FORMAT must be %q or %q, got %q", LogFormatText, LogFormatJSON, format)
	}
}
