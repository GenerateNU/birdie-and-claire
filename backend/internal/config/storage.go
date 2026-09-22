package config

import (
	"fmt"
	"os"
)

type StorageConfig struct {
	Endpoint string // "" => real AWS
	Bucket   string
}

func loadStorage() (StorageConfig, error) {
	bucket := os.Getenv("S3_BUCKET")
	if bucket == "" {
		return StorageConfig{}, fmt.Errorf("S3_BUCKET is required")
	}

	// credentials themselves are read by the SDK's default chain (AWS_* env);
	// we only require that SOME are present so the SDK doesn't error later.
	if os.Getenv("AWS_ACCESS_KEY_ID") == "" || os.Getenv("AWS_SECRET_ACCESS_KEY") == "" {
		return StorageConfig{}, fmt.Errorf("AWS credentials missing (use test/test for Floci)")
	}

	return StorageConfig{
		Endpoint: os.Getenv("S3_ENDPOINT"), // may be empty => real AWS
		Bucket:   bucket,
	}, nil
}
