package config

import (
	"fmt"
	"os"
	"strconv"
)

const defaultMaxUploadBytes = 5 << 20 // 5 MiB

type StorageConfig struct {
	Endpoint       string // API uses (floci:4566 in-container); "" = real AWS
	PublicEndpoint string // browser uses (localhost:4566); presigned URLs sign to this
	Region         string
	Bucket         string
	MaxUploadBytes int64
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

	endpoint := os.Getenv("S3_ENDPOINT")
	publicEndpoint := os.Getenv("S3_PUBLIC_ENDPOINT")
	if (endpoint == "") != (publicEndpoint == "") {
		return StorageConfig{}, fmt.Errorf("S3_ENDPOINT and S3_PUBLIC_ENDPOINT must be set together (both empty for real AWS)")
	}

	maxUploadBytes, err := loadMaxUploadBytes()
	if err != nil {
		return StorageConfig{}, err
	}

	return StorageConfig{
		Endpoint:       endpoint,
		PublicEndpoint: publicEndpoint,
		Region:         region,
		Bucket:         bucket,
		MaxUploadBytes: maxUploadBytes,
	}, nil
}

func loadMaxUploadBytes() (int64, error) {
	raw := os.Getenv("S3_MAX_UPLOAD_BYTES")
	if raw == "" {
		return defaultMaxUploadBytes, nil
	}

	maxUploadBytes, err := strconv.ParseInt(raw, 10, 64)
	if err != nil || maxUploadBytes <= 0 {
		return 0, fmt.Errorf("S3_MAX_UPLOAD_BYTES must be a positive number, got %q", raw)
	}
	return maxUploadBytes, nil
}
