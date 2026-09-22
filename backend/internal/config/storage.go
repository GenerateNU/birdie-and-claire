package config

import (
	"fmt"
	"os"
	"time"
)

// Connection pool defaults. Postgres allows 100 connections by default, so
// these leave room for migrations, psql sessions, and a second replica.
const (
	defaultMaxOpenConns    = 25
	defaultMaxIdleConns    = 5
	defaultConnMaxLifetime = 5 * time.Minute
	defaultConnMaxIdleTime = 2 * time.Minute
	defaultPingTimeout     = 10 * time.Second
)

type DatabaseConfig struct {
	URL             string
	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxLifetime time.Duration
	ConnMaxIdleTime time.Duration
	PingTimeout     time.Duration
}

func loadDatabase() (DatabaseConfig, error) {
	url := os.Getenv("DATABASE_URL")
	if url == "" {
		return DatabaseConfig{}, fmt.Errorf("DATABASE_URL is required")
	}

	return DatabaseConfig{
		URL:             url,
		MaxOpenConns:    defaultMaxOpenConns,
		MaxIdleConns:    defaultMaxIdleConns,
		ConnMaxLifetime: defaultConnMaxLifetime,
		ConnMaxIdleTime: defaultConnMaxIdleTime,
		PingTimeout:     defaultPingTimeout,
	}, nil
}
