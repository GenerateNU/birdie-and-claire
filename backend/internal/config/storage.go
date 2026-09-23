package config

import (
	"fmt"
	"os"
)

type StorageConfig struct {
	Endpoint string // "" => real AWS
	Region   string
	Bucket   string
}

func loadStorage() (StorageConfig, error) {
	bucket := os.Getenv("S3_BUCKET")
	if bucket == "" {
		return StorageConfig{}, fmt.Errorf("S3_BUCKET is required")
	}

	region := os.Getenv("S3_REGION")
	if region == "" {
		return StorageConfig{}, fmt.Errorf("S3_REGION is required")
	}

	if os.Getenv("AWS_ACCESS_KEY_ID") == "" || os.Getenv("AWS_SECRET_ACCESS_KEY") == "" {
		return StorageConfig{}, fmt.Errorf("AWS credentials missing (use test/test for Floci)")
	}

	return StorageConfig{
		Endpoint: os.Getenv("S3_ENDPOINT"),
		Region:   region,
		Bucket:   bucket,
	}, nil
}